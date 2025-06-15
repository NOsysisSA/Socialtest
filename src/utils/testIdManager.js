export function generateTestId() {
  return `test_${new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14)}`;
}

export function getCurrentTestId() {
  return localStorage.getItem("currentTestId");
}

export function setCurrentTestId(testId) {
  localStorage.setItem("currentTestId", testId);
}

export function clearCurrentTestId() {
  localStorage.removeItem("currentTestId");
}