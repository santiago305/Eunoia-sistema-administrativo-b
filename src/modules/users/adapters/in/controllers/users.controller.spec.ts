import { UsersController } from "./users.controller";

describe("UsersController", () => {
  it("saves uploaded avatars in the public storage area", async () => {
    const updateAvatarUseCase = { execute: jest.fn().mockResolvedValue({}) };
    const imageProcessor = {
      toWebp: jest.fn().mockResolvedValue({
        buffer: Buffer.from("webp"),
        extension: "webp",
      }),
    };
    const fileStorage = {
      save: jest.fn().mockResolvedValue({
        relativePath: "/api/assets/users/user-1.webp",
      }),
      delete: jest.fn(),
    };
    const controller = new UsersController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      updateAvatarUseCase as never,
      {} as never,
      {} as never,
      imageProcessor as never,
      fileStorage as never,
    );

    await controller.uploadAvatar(
      {
        buffer: Buffer.from("image"),
        originalname: "avatar.png",
        mimetype: "image/png",
      } as Express.Multer.File,
      { id: "user-1" },
    );

    expect(fileStorage.save).toHaveBeenCalledWith(expect.objectContaining({
      area: "public",
      directory: "users",
    }));
  });
});
