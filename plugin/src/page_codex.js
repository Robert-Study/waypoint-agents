// page_codex.js [worker-d] - CC.CodexPage: talk to Codex directly (stream, resume, model + effort).
// Your own sends keep a confirm click that shows current Codex usage first.
(function (CC) {
  'use strict';
  CC.CodexPage = function CodexPage() {
    return CC.h(CC.ChatPanel, { agentId: 'codex', name: 'Codex', pageId: 'cc-codex' });
  };
})(CC);
