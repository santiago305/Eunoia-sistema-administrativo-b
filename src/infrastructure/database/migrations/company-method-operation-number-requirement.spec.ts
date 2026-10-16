import { AddCompanyMethodOperationNumberRequirement20261016010000 } from "./20261016010000-add-company-method-operation-number-requirement";

describe("AddCompanyMethodOperationNumberRequirement20261016010000", () => {
  it("adds the company-level flag and backfills every existing link as required", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const migration = new AddCompanyMethodOperationNumberRequirement20261016010000();

    await migration.up({ query } as any);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("requires_operation_number boolean NOT NULL DEFAULT true"),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE company_methods[\s\S]*requires_operation_number = true/),
    );
  });

  it("removes only the new setting when rolled back", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const migration = new AddCompanyMethodOperationNumberRequirement20261016010000();

    await migration.down({ query } as any);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DROP COLUMN IF EXISTS requires_operation_number"),
    );
  });
});
