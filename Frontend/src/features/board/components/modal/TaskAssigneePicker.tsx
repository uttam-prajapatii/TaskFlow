import React from 'react';
import Icon from '../../../../components/UI/Icon';
import Avatar from '../../../../components/UI/Avatar';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
}

interface TaskAssigneePickerProps {
  teamMembers: TeamMember[];
  selectedAssignees: string[];
  onToggleAssignee: (memberId: string) => void;
  assigneeMenuOpen: boolean;
  setAssigneeMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  assigneeSearch: string;
  setAssigneeSearch: (val: string) => void;
}

export const TaskAssigneePicker: React.FC<TaskAssigneePickerProps> = ({
  teamMembers,
  selectedAssignees,
  onToggleAssignee,
  assigneeMenuOpen,
  setAssigneeMenuOpen,
  assigneeSearch,
  setAssigneeSearch,
}) => {
  const filteredMembers = teamMembers.filter((m) => {
    const query = assigneeSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(query) ||
      (m.email || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative">
      <label className="block text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
        Assignees
      </label>

      {/* Selected Assignees Chips + Add Button */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 min-h-[42px] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60">
        {selectedAssignees.map((id) => {
          const member = teamMembers.find((m) => m.id === id);
          const name = member?.name || 'Assignee';
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-[11.5px] font-medium text-neutral-800 dark:text-neutral-200 shadow-2xs"
            >
              <Avatar name={name} size={18} ring={false} />
              <span>{name}</span>
              <button
                type="button"
                onClick={() => onToggleAssignee(id)}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer ml-0.5"
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setAssigneeMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition cursor-pointer"
        >
          <Icon name="plus" size={13} />
          <span>{selectedAssignees.length === 0 ? 'Assign member…' : 'Add more'}</span>
        </button>
      </div>

      {/* Assignee Search Dropdown */}
      {assigneeMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setAssigneeMenuOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-2 max-h-56 overflow-y-auto">
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search team members…"
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-[12px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-orange-400/30"
                autoFocus
              />
              <Icon
                name="search"
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>

            <div className="space-y-0.5">
              {filteredMembers.length === 0 ? (
                <p className="text-[11.5px] text-neutral-400 text-center py-2">
                  No members found
                </p>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = selectedAssignees.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggleAssignee(m.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[12px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={m.name} size={22} ring={false} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          {m.email && (
                            <p className="text-[10.5px] text-neutral-400 truncate">
                              {m.email}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Icon name="check" size={14} className="text-orange-500 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TaskAssigneePicker;
