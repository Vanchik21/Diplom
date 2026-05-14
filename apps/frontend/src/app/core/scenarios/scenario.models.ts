export interface Scenario {
  id: string;
  moduleId: string;
  name: string;
  paramsJson: string;
  stateSnapshotJson: string;
  predictionsJson: string;
  createdAt: string;
}

export interface CreateScenarioRequest {
  moduleId: string;
  name: string;
  paramsJson: string;
  stateSnapshotJson: string;
  predictionsJson: string;
}
