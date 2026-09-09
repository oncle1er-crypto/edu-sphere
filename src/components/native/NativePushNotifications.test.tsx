import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  status: vi.fn(), native: vi.fn(), auth: { user: { id: "user-1" } as { id: string } | null },
  register: vi.fn(), unregister: vi.fn(), permission: vi.fn(), remove: vi.fn(),
  listener: vi.fn(), channel: vi.fn(), navigate: vi.fn(), rpc: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: mocks.native, getPlatform: () => "android" },
  registerPlugin: () => ({ getStatus: mocks.status }),
}));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: {
  register: mocks.register, unregister: mocks.unregister,
  checkPermissions: mocks.permission, requestPermissions: mocks.permission,
  addListener: mocks.listener, createChannel: mocks.channel,
} }));
vi.mock("@capacitor/status-bar", () => ({ StatusBar: {
  setBackgroundColor: vi.fn(), setStyle: vi.fn(),
}, Style: { Light: "LIGHT" } }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/context/EcoleContext", () => ({ useEcoles: () => ({ currentEcoleId: "school-1" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
import { NativePushNotifications } from "./NativePushNotifications";

describe("Android push lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.user = { id: "user-1" };
    mocks.native.mockReturnValue(true);
    mocks.status.mockResolvedValue({ pushConfigured: false });
    mocks.permission.mockResolvedValue({ receive: "granted" });
    mocks.listener.mockResolvedValue({ remove: mocks.remove });
    mocks.register.mockResolvedValue(undefined);
    mocks.unregister.mockResolvedValue(undefined);
  });
  it("never calls Firebase after login or logout when configuration is absent", async () => {
    const view = render(<NativePushNotifications />);
    await act(async () => {});
    expect(mocks.status).toHaveBeenCalledOnce();
    mocks.auth.user = null;
    view.rerender(<NativePushNotifications />);
    await act(async () => {});
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.unregister).not.toHaveBeenCalled();
    expect(mocks.permission).not.toHaveBeenCalled();
    expect(mocks.channel).not.toHaveBeenCalled();
  });
  it("registers configured devices and removes listeners on logout", async () => {
    mocks.status.mockResolvedValue({ pushConfigured: true });
    const view = render(<NativePushNotifications />);
    await waitFor(() => expect(mocks.register).toHaveBeenCalledOnce());
    view.unmount();
    await waitFor(() => expect(mocks.unregister).toHaveBeenCalledOnce());
    expect(mocks.remove).toHaveBeenCalledTimes(4);
  });
  it("does not register or unregister when permission is denied", async () => {
    mocks.status.mockResolvedValue({ pushConfigured: true });
    mocks.permission.mockResolvedValue({ receive: "denied" });
    const view = render(<NativePushNotifications />);
    await waitFor(() => expect(mocks.permission).toHaveBeenCalled());
    view.unmount();
    await act(async () => {});
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.unregister).not.toHaveBeenCalled();
  });
  it("cancels initialization if logout happens during the configuration check", async () => {
    let resolve!: (value: { pushConfigured: boolean }) => void;
    mocks.status.mockReturnValue(new Promise(r => { resolve = r; }));
    const view = render(<NativePushNotifications />);
    view.unmount();
    await act(async () => resolve({ pushConfigured: true }));
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.unregister).not.toHaveBeenCalled();
  });
  it("does not initialize Android services on web", async () => {
    mocks.native.mockReturnValue(false);
    render(<NativePushNotifications />);
    await act(async () => {});
    expect(mocks.status).not.toHaveBeenCalled();
  });
});
