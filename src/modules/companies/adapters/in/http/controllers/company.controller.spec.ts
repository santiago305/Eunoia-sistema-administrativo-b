import { CompanyController } from "./company.controller";

describe("CompanyController", () => {
  const buildController = () => {
    const imageProcessor = {
      toWebp: jest.fn().mockResolvedValue({
        buffer: Buffer.from("webp"),
        extension: "webp",
      }),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        relativePath: "/api/assets/company/file.webp",
      }),
    };
    const updateCompanyLogoUsecase = { execute: jest.fn() };
    const updateCompanyIsotypeUsecase = { execute: jest.fn() };
    const updateCompanyCertUsecase = { execute: jest.fn() };
    const controller = new CompanyController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      updateCompanyLogoUsecase as never,
      updateCompanyIsotypeUsecase as never,
      updateCompanyCertUsecase as never,
      imageProcessor as never,
      fileStorage as never,
    );

    return { controller, fileStorage };
  };

  it("saves uploaded logos in the public storage area", async () => {
    const { controller, fileStorage } = buildController();

    await controller.updateLogo({
      buffer: Buffer.from("logo"),
      originalname: "logo.png",
      mimetype: "image/png",
    } as Express.Multer.File);

    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: "public",
      directory: "company",
      filenamePrefix: "logo",
    }));
  });

  it("saves uploaded isotypes in the public storage area", async () => {
    const { controller, fileStorage } = buildController();

    await controller.updateIsotype({
      buffer: Buffer.from("isotype"),
      originalname: "isotype.png",
      mimetype: "image/png",
    } as Express.Multer.File);

    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: "public",
      directory: "company",
      filenamePrefix: "isotype",
    }));
  });

  it("saves uploaded certs in the public storage area", async () => {
    const { controller, fileStorage } = buildController();

    await controller.updateCert({
      buffer: Buffer.from("cert"),
      originalname: "cert.pfx",
    } as Express.Multer.File);

    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: "public",
      directory: "company",
      filenamePrefix: "cert",
    }));
  });
});
