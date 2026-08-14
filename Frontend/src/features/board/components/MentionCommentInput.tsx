import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '../../../components/UI/Avatar';
import workspaceService from '../../../services/workspace.service';

export interface WorkspaceMemberInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
}

interface MentionCommentInputProps {
  workspaceId?: string;
  onSubmit: (body: string, mentions: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  submitButtonLabel?: string;
}

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const MentionCommentInput: React.FC<MentionCommentInputProps> = ({
  workspaceId,
  onSubmit,
  disabled = false,
  placeholder = 'Add a comment… (Use @name to mention team members)',
  initialValue = '',
  submitButtonLabel = 'Send',
}) => {
  const [text, setText] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [selectedMentionMap, setSelectedMentionMap] = useState<Map<string, string>>(new Map()); // name/email -> id
  const [inputError, setInputError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fetch workspace members strictly from the active workspace
  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setFilteredMembers([]);
      return;
    }
    let isCancelled = false;
    workspaceService
      .listMembers(workspaceId)
      .then((res) => {
        if (isCancelled) return;
        const formatted: WorkspaceMemberInfo[] = res.map((m) => {
          const uObj = typeof m.userId === 'object' && m.userId !== null ? m.userId : null;
          const id = uObj ? uObj._id : (m.userId as string);
          const name = uObj ? (uObj.fullName || uObj.name || uObj.email || 'Member') : 'Member';
          const email = uObj ? uObj.email : undefined;
          const avatar = uObj ? (uObj as { avatarUrl?: string }).avatarUrl : undefined;
          return { id, name, email, avatar };
        });
        setMembers(formatted);
      })
      .catch(() => {
        if (!isCancelled) {
          setMembers([]);
          setFilteredMembers([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [workspaceId]);

  // Filter members based on search query
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchQuery.trim().toLowerCase();

    if (!trimmed) {
      setFilteredMembers(members);
      setSelectedIndex(0);
      return;
    }

    // Filter local members first for instantaneous zero-latency response
    const localFiltered = members.filter(
      (m) =>
        m.name.toLowerCase().includes(trimmed) ||
        (m.email && m.email.toLowerCase().includes(trimmed))
    );

    setFilteredMembers(localFiltered);
    setSelectedIndex(0);

    // If workspace search API is available, also search remote if needed
    if (workspaceId && trimmed.length >= 2) {
      let isCancelled = false;
      workspaceService
        .searchMembers(workspaceId, trimmed)
        .then((res) => {
          if (isCancelled) return;
          if (res && res.length > 0) {
            const mapped: WorkspaceMemberInfo[] = res.map((u) => ({
              id: u._id,
              name: u.name || u.email || 'Member',
              email: u.email,
              avatar: u.avatar,
            }));
            // Merge deduplicated
            setFilteredMembers((prev) => {
              const combined = [...prev];
              mapped.forEach((item) => {
                if (!combined.some((c) => c.id === item.id)) {
                  combined.push(item);
                }
              });
              return combined;
            });
          }
        })
        .catch(() => {
          // Keep local filtered on error
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [isOpen, searchQuery, workspaceId, members]);

  // Precise mention token parser using cursor position
  const evaluateMentionTrigger = useCallback(
    (currentVal: string, cursorPos: number) => {
      const textBeforeCursor = currentVal.slice(0, cursorPos);

      // Find the nearest '@' before the cursor on the current line
      let activeAtIndex = -1;
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === '\n') {
          break; // Mentions do not cross newline boundaries
        }
        if (textBeforeCursor[i] === '@') {
          // Check that '@' is at start of string or preceded by whitespace
          if (i === 0 || /\s/.test(textBeforeCursor[i - 1])) {
            activeAtIndex = i;
            break;
          }
        }
      }

      if (activeAtIndex === -1) {
        setIsOpen(false);
        setMentionStartIndex(null);
        setSearchQuery('');
        return;
      }

      const textFromAt = currentVal.slice(activeAtIndex);

      // Check if the '@' at activeAtIndex is an already completed mention
      // A mention is completed if it matches @<MemberName> and the cursor is after the delimiter/space
      const isCompleted = members.some((m) => {
        const mentionPattern = `@${m.name}`;
        if (textFromAt.startsWith(mentionPattern)) {
          const charAfter = textFromAt.charAt(mentionPattern.length);
          // If followed by space or punctuation and cursor is past the completed token
          if (
            (charAfter === ' ' ||
              charAfter === '\n' ||
              charAfter === ',' ||
              charAfter === '.' ||
              charAfter === '!' ||
              charAfter === '?' ||
              charAfter === '') &&
            cursorPos >= activeAtIndex + mentionPattern.length + (charAfter === ' ' ? 1 : 0)
          ) {
            return true;
          }
        }
        return false;
      });

      if (isCompleted) {
        setIsOpen(false);
        setMentionStartIndex(null);
        setSearchQuery('');
        return;
      }

      // User is actively typing an uncompleted mention
      const query = textBeforeCursor.slice(activeAtIndex + 1);

      // Mentions cannot contain newlines or excessive spaces
      if (query.includes('\n') || query.split(' ').length > 3 || query.length > 40) {
        setIsOpen(false);
        setMentionStartIndex(null);
        setSearchQuery('');
        return;
      }

      setMentionStartIndex(activeAtIndex);
      setSearchQuery(query);
      setIsOpen(true);
    },
    [members]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setText(val);
    if (inputError) setInputError(null);
    evaluateMentionTrigger(val, cursorPos);
  };

  const handleSelectOrKeyUp = () => {
    if (textareaRef.current) {
      const val = textareaRef.current.value;
      const cursorPos = textareaRef.current.selectionStart || 0;
      evaluateMentionTrigger(val, cursorPos);
    }
  };

  // Insert selected member mention into comment
  const insertMention = useCallback(
    (member: WorkspaceMemberInfo) => {
      if (mentionStartIndex === null || !textareaRef.current) return;

      const cursorPos = textareaRef.current.selectionStart || 0;
      const textBefore = text.slice(0, mentionStartIndex);
      const textAfter = text.slice(cursorPos);
      const mentionText = `@${member.name} `;

      const newText = `${textBefore}${mentionText}${textAfter}`;
      const newCursorPos = mentionStartIndex + mentionText.length;

      // Track mapping of mentioned name -> user ID
      setSelectedMentionMap((prev) => {
        const next = new Map(prev);
        next.set(member.name, member.id);
        if (member.email) next.set(member.email, member.id);
        return next;
      });

      setText(newText);
      setIsOpen(false);
      setMentionStartIndex(null);
      setSearchQuery('');

      // Restore focus and position cursor right after the mention token
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [mentionStartIndex, text]
  );

  // Keyboard navigation for mention autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isOpen && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMembers[selectedIndex];
        if (selected) {
          insertMention(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    // Submit on Ctrl+Enter or Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setInputError('Comment cannot be empty');
      return;
    }
    if (trimmed.length > 2000) {
      setInputError('Comment cannot exceed 2000 characters');
      return;
    }

    // Extract mentioned user IDs present in the comment body
    const mentionedIdsSet = new Set<string>();

    // 1. Check loaded workspace members
    members.forEach((m) => {
      const nameRegex = new RegExp(`@${escapeRegex(m.name)}(?:\\b|\\s|$)`, 'i');
      if (nameRegex.test(trimmed)) {
        mentionedIdsSet.add(m.id);
      } else if (m.email) {
        const emailRegex = new RegExp(`@${escapeRegex(m.email)}(?:\\b|\\s|$)`, 'i');
        if (emailRegex.test(trimmed)) {
          mentionedIdsSet.add(m.id);
        }
      }
    });

    // 2. Check tracked selected mentions map
    selectedMentionMap.forEach((id, name) => {
      const reg = new RegExp(`@${escapeRegex(name)}(?:\\b|\\s|$)`, 'i');
      if (reg.test(trimmed)) {
        mentionedIdsSet.add(id);
      }
    });

    onSubmit(trimmed, Array.from(mentionedIdsSet));
    setText('');
    setSelectedMentionMap(new Map());
    setIsOpen(false);
    setInputError(null);
  };

  return (
    <div className="relative w-full">
      {/* Mention Suggestions Popup */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-2 z-50 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl p-1.5 space-y-1"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span>Workspace Members</span>
            {searchQuery && <span className="text-orange-500 lowercase">@{searchQuery}</span>}
          </div>

          {filteredMembers.length === 0 ? (
            <div className="px-3 py-2.5 text-center text-[12px] text-neutral-400 dark:text-neutral-500 italic">
              No workspace members found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredMembers.map((member, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-500/15 text-orange-950 dark:text-orange-200'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <Avatar name={member.name} size={24} ring={false} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-medium truncate">{member.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                          ↵ Enter
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                        {member.email}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Comment Form Input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <div className="relative flex items-center gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInputChange}
            onKeyUp={handleSelectOrKeyUp}
            onClick={handleSelectOrKeyUp}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={2}
            className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 outline-none resize-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="self-end px-3.5 py-2 text-[12.5px] font-medium rounded-lg text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
          >
            {disabled ? 'Sending…' : submitButtonLabel}
          </button>
        </div>
        {inputError && (
          <span className="text-[11px] text-rose-500 px-1">{inputError}</span>
        )}
      </form>
    </div>
  );
};

export default MentionCommentInput;
