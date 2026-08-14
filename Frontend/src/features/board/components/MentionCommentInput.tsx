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
  const [selectedMentionMap, setSelectedMentionMap] = useState<Map<string, string>>(new Map()); // name -> id
  const [inputError, setInputError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fetch workspace members if workspaceId is present
  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
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
          return { id, name, email };
        });
        setMembers(formatted);
      })
      .catch(() => {
        if (!isCancelled) setMembers([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [workspaceId]);

  // Fetch or filter workspace members when search query changes
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchQuery.trim().toLowerCase();

    // If workspace search API is available, search debounced or filter local
    if (workspaceId && trimmed.length > 0) {
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
            setFilteredMembers(mapped);
          } else {
            // Fallback filter local
            const localFiltered = members.filter(
              (m) =>
                m.name.toLowerCase().includes(trimmed) ||
                (m.email && m.email.toLowerCase().includes(trimmed))
            );
            setFilteredMembers(localFiltered);
          }
          setSelectedIndex(0);
        })
        .catch(() => {
          if (isCancelled) return;
          const localFiltered = members.filter(
            (m) =>
              m.name.toLowerCase().includes(trimmed) ||
              (m.email && m.email.toLowerCase().includes(trimmed))
          );
          setFilteredMembers(localFiltered);
          setSelectedIndex(0);
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setFilteredMembers(members);
      setSelectedIndex(0);
    }
  }, [isOpen, searchQuery, workspaceId, members]);

  // Check text around cursor for mention trigger `@`
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setText(val);
    if (inputError) setInputError(null);

    const textBeforeCursor = val.slice(0, cursorPos);
    // Find the last '@' symbol before cursor that is preceded by start of string or whitespace
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        // Valid query must not contain newlines
        if (!query.includes('\n')) {
          setMentionStartIndex(lastAtIndex);
          setSearchQuery(query);
          setIsOpen(true);
          return;
        }
      }
    }

    setIsOpen(false);
    setMentionStartIndex(null);
    setSearchQuery('');
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

      // Restore focus and update cursor position
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

    // 1. Check known selected mentions map
    selectedMentionMap.forEach((id, name) => {
      if (trimmed.includes(`@${name}`)) {
        mentionedIdsSet.add(id);
      }
    });

    // 2. Also check loaded workspace members
    members.forEach((m) => {
      if (trimmed.includes(`@${m.name}`) || (m.email && trimmed.includes(`@${m.email}`))) {
        mentionedIdsSet.add(m.id);
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
