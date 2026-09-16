export type ConnectivityState = "ONLINE" | "OFFLINE";

export function getConnectivityState(): ConnectivityState {
  if (typeof navigator === "undefined") return "ONLINE";
  return navigator.onLine ? "ONLINE" : "OFFLINE";
}

export function onConnectivityChange(listener: (state: ConnectivityState) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleOnline = () => listener("ONLINE");
  const handleOffline = () => listener("OFFLINE");

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
