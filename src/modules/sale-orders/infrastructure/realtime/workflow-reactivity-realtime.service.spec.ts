import { WorkflowReactivityRealtimeService } from "./workflow-reactivity-realtime.service";

const createSocket = (id: string) => ({
  id,
  emit: jest.fn(),
});

describe("WorkflowReactivityRealtimeService", () => {
  it("emits an event to every connected workflow-reactivity socket", () => {
    const service = new WorkflowReactivityRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-2", socketB as any);

    service.emitToAllConnected("workflow-reactivity.processing", {
      source: "client",
      trigger: "client-updated",
    });

    expect(socketA.emit).toHaveBeenCalledWith("workflow-reactivity.processing", {
      source: "client",
      trigger: "client-updated",
    });
    expect(socketB.emit).toHaveBeenCalledWith("workflow-reactivity.processing", {
      source: "client",
      trigger: "client-updated",
    });
    expect(service.connectedUsersCount()).toBe(2);
    expect(service.activeConnectionsCount()).toBe(2);
  });

  it("removes disconnected sockets without removing the user's other sockets", () => {
    const service = new WorkflowReactivityRealtimeService();
    const socketA = createSocket("socket-a");
    const socketB = createSocket("socket-b");

    service.registerConnection("user-1", socketA as any);
    service.registerConnection("user-1", socketB as any);
    service.unregisterConnection("user-1", "socket-a");

    service.emitToAllConnected("workflow-reactivity.processed", {
      source: "inventory",
      updated: 1,
    });

    expect(socketA.emit).not.toHaveBeenCalled();
    expect(socketB.emit).toHaveBeenCalledWith("workflow-reactivity.processed", {
      source: "inventory",
      updated: 1,
    });
    expect(service.connectedUsersCount()).toBe(1);
    expect(service.activeConnectionsCount()).toBe(1);
  });
});
