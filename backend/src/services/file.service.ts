const execution = await response.json() as any;

return {
  id: execution.id,
  workflowId: execution.workflowId,
  status: execution.finished 
    ? (execution.mode === 'error' ? 'error' : 'success')
    : 'running',
  startedAt: execution.startedAt,
  stoppedAt: execution.stoppedAt,
  executionTime: execution.executionTime,
  data: execution.data
};