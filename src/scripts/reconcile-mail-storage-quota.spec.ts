import { reconcileMailStorageQuota } from "../../scripts/reconcile-mail-storage-quota";

describe("reconcile-mail-storage-quota", () => {
  it("reports over-quota and missing references without mutating data", async () => {
    const dataSource = {
      query: jest.fn(async () => [
        { userId: "u-1", quotaBytes: "100", usedBytes: "120", activeRefs: 2, missingAttachmentRefs: 0 },
        { userId: "u-2", quotaBytes: "100", usedBytes: "20", activeRefs: 1, missingAttachmentRefs: 1 },
      ]),
    } as any;

    const report = await reconcileMailStorageQuota(dataSource);

    expect(report.readOnly).toBe(true);
    expect(report.ok).toBe(false);
    expect(report.overQuotaUsers.map((user) => user.userId)).toEqual(["u-1"]);
    expect(report.missingAttachmentRefs).toBe(1);
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });
});
