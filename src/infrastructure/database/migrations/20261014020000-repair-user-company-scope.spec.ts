import { RepairUserCompanyScope20261014020000 } from "./20261014020000-repair-user-company-scope";

describe("RepairUserCompanyScope20261014020000", () => {
  it("backfills unassigned normal users when exactly one active company exists", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ company_id: "company-eunoia" }])
      .mockResolvedValueOnce([{ total: "3" }])
      .mockResolvedValue([]);

    await new RepairUserCompanyScope20261014020000().up({ query } as never);

    expect(query).toHaveBeenCalledWith(
      "UPDATE users SET company_id = $1 WHERE company_id IS NULL AND is_super_admin = false",
      ["company-eunoia"],
    );
  });

  it("fails safely when multiple companies exist and users need assignment", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ company_id: "company-a" }, { company_id: "company-b" }])
      .mockResolvedValueOnce([{ total: "1" }]);

    await expect(new RepairUserCompanyScope20261014020000().up({ query } as never)).rejects.toThrow(
      "debe existir exactamente una empresa activa",
    );
  });
});
