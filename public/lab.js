/**
 * Runs a lab selection against one or more policies and renders only the
 * newest request's results, and only if every result is for the selected case.
 * @param {{ simulate: Function, render: Function, renderError: Function, renderLoading?: Function }} handlers
 */
export function createLabRunner({ simulate, render, renderLoading, renderError }) {
  let seq = 0;
  return async function run(selection, policies) {
    const mine = ++seq;
    renderLoading?.(selection, policies);
    try {
      const runs = await Promise.all(policies.map(async (p) => [p, await simulate(selection, p)]));
      if (mine !== seq) return "stale";
      const wanted = selectionId(selection);
      const wrong = runs.find(([, d]) => d.result.scenarioId !== wanted);
      if (wrong) throw new Error(`Result is for ${wrong[1].result.scenarioId}, but ${wanted} is selected. Please rerun.`);
      render(runs, selection);
      return "rendered";
    } catch (e) {
      if (mine !== seq) return "stale";
      renderError(e, selection);
      return "error";
    }
  };
}

export function selectionId(selection) {
  return selection.custom ? selection.scenario.id : selection.scenarioId;
}

export function simulatePayload(selection, policy, provider) {
  return selection.custom
    ? { policy, provider, scenario: selection.scenario }
    : { policy, provider, scenarioId: selection.scenarioId };
}
