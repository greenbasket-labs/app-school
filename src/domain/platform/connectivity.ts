export type ConnectivityState = "ONLINE" | "OFFLINE";

export function getConnectivityState(): ConnectivityState {
  if (typeof navigator === "undefined") return "OFFLINE";
  return navigator.onLine ? "ONLINE" : "OFFLINE";
}
