// page_claude.js [worker-d] - CC.ClaudePage: talk to Claude Code directly (stream, resume, model + effort).
(function (CC) {
  'use strict';
  CC.ClaudePage = function ClaudePage() {
    return CC.h(CC.ChatPanel, { agentId: 'claude_code', name: 'Claude Code', pageId: 'cc-claude' });
  };
})(CC);
