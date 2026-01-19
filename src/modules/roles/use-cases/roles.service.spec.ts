// import { Test, TestingModule } from '@nestjs/testing';
// import { RolesService } from './roles.service';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { Role } from 'src/modules/roles/infrastructure/orm-entities/role.entity';
// import { Repository } from 'typeorm';
// import { CreateRoleDto } from 'src/modules/roles/adapters/in/dtos/create-role.dto';
// import { successResponse } from 'src/shared/response-standard/response';
// import { UnauthorizedException } from '@nestjs/common';

// describe('RolesService - create()', () => {
//   let service: RolesService;
//   let repository: Repository<Role>;

//   const queryBuilder = {
//     insert: jest.fn().mockReturnThis(),
//     into: jest.fn().mockReturnThis(),
//     values: jest.fn().mockReturnThis(),
//     returning: jest.fn().mockReturnThis(),
//     execute: jest.fn(),
//     where: jest.fn().mockReturnThis(),
//     andWhere: jest.fn().mockReturnThis(),
//     getExists: jest.fn(),
//   };

//   const mockRepository = {
//     createQueryBuilder: jest.fn(() => queryBuilder),
//   };

//   beforeEach(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         RolesService,
//         {
//           provide: getRepositoryToken(Role),
//           useValue: mockRepository,
//         },
//       ],
//     }).compile();

//     service = module.get<RolesService>(RolesService);
//     repository = module.get<Repository<Role>>(getRepositoryToken(Role));
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it('debe retornar error si el rol ya existe', async () => {
//     queryBuilder.getExists.mockResolvedValue(true);

//     const dto: CreateRoleDto = { description: 'Admin' };
//     await expect(service.create(dto)).rejects.toThrow(
//       new UnauthorizedException('Ese rol ya existe')
//     );
//   });

//   it('debe crear el rol correctamente si no existe', async () => {
//     queryBuilder.getExists.mockResolvedValue(false);
//     queryBuilder.execute.mockResolvedValue({});

//     const dto: CreateRoleDto = { description: 'Nuevo Rol' };
//     const result = await service.create(dto);

//     expect(result).toEqual(successResponse('Rol creado exitosamente'));
//   });

//   it('debe retornar error si ocurre una excepciAn', async () => {
//     queryBuilder.getExists.mockResolvedValue(false);
//     queryBuilder.execute.mockRejectedValue(new Error('Error interno'));

//     const dto: CreateRoleDto = { description: 'Otro Rol' };
//     await expect(service.create(dto)).rejects.toThrow(
//       new UnauthorizedException('No hemos podido crear el rol')
//     );
//   });
// });

