import { PrismaPg } from '@prisma/adapter-pg';
import {
  CalcType,
  PrismaClient,
  ProfitType,
  Role,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ===========================
  // 1. Super Admin
  // ===========================
  const phone = process.env.SUPER_ADMIN_PHONE || '+77000000000';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'admin12345';
  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      password: hashedPassword,
      role: Role.SUPER,
      status: UserStatus.ACTIVE,
      activeUntil: new Date('2099-12-31'),
    },
  });
  console.log(`✅ Super admin: ${superAdmin.phone} (id: ${superAdmin.id})`);

  // ===========================
  // 2. Типы комнат
  // ===========================
  const roomTypes = [
    'Гостиная',
    'Спальня',
    'Кухня',
    'Детская',
    'Прихожая',
    'Ванная',
    'Кабинет',
    'Балкон',
  ];

  for (const name of roomTypes) {
    await prisma.roomType.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
  }
  console.log(`✅ Room types: ${roomTypes.length}`);

  // ===========================
  // 3. Типы изделий
  // ===========================
  const productTypes = [
    'Шкаф',
    'Тумба',
    'Комод',
    'Полка',
    'Стол',
    'Кухонный гарнитур',
    'Стеллаж',
    'Шкаф-купе',
  ];

  for (const name of productTypes) {
    await prisma.productType.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
  }
  console.log(`✅ Product types: ${productTypes.length}`);

  // ===========================
  // 4. Типы материалов (расширяемые)
  // ===========================
  const materialTypeNames = ['ЛДСП', 'МДФ', 'ХДФ', 'Камень', 'Кромка'];
  const materialTypes: Record<string, string> = {};

  for (const name of materialTypeNames) {
    const mt = await prisma.materialType.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
    materialTypes[name] = mt.id;
  }
  console.log(`✅ Material types: ${materialTypeNames.length}`);

  // ===========================
  // 5. Типы фурнитуры (расширяемые)
  // ===========================
  const hardwareTypeNames = [
    'Петли',
    'Направляющие',
    'Полкодержатели',
    'Тандем',
    'Ножки',
    'Ручки',
    'Конфирмат',
    'Tip-On',
  ];
  const hardwareTypes: Record<string, string> = {};

  for (const name of hardwareTypeNames) {
    const ht = await prisma.hardwareType.upsert({
      where: { id: name },
      update: {},
      create: { id: name, name },
    });
    hardwareTypes[name] = ht.id;
  }
  console.log(`✅ Hardware types: ${hardwareTypeNames.length}`);

  // ===========================
  // 6. Начальные материалы
  // ===========================
  const materials = [
    // ЛДСП
    {
      materialTypeId: materialTypes['ЛДСП'],
      brand: 'Egger',
      calcType: CalcType.SHEET,
      length: 2800,
      width: 2070,
      price: 18000,
    },
    {
      materialTypeId: materialTypes['ЛДСП'],
      brand: 'Kronospan',
      calcType: CalcType.SHEET,
      length: 2800,
      width: 2070,
      price: 15000,
    },
    {
      materialTypeId: materialTypes['ЛДСП'],
      brand: 'Kastamonu',
      calcType: CalcType.SHEET,
      length: 2800,
      width: 2070,
      price: 12000,
    },
    // МДФ
    {
      materialTypeId: materialTypes['МДФ'],
      brand: 'AGT',
      calcType: CalcType.SQM,
      length: 1,
      width: 1,
      price: 25000,
    },
    {
      materialTypeId: materialTypes['МДФ'],
      brand: 'Alvic',
      calcType: CalcType.SQM,
      length: 1,
      width: 1,
      price: 35000,
    },
    // ХДФ
    {
      materialTypeId: materialTypes['ХДФ'],
      brand: 'Kronospan',
      calcType: CalcType.SHEET,
      length: 2800,
      width: 2070,
      price: 4000,
    },
    {
      materialTypeId: materialTypes['ХДФ'],
      brand: 'Egger',
      calcType: CalcType.SQM,
      length: 1,
      width: 1,
      price: 2500,
    },
    // Камень
    {
      materialTypeId: materialTypes['Камень'],
      brand: 'Samsung Staron',
      calcType: CalcType.LM,
      length: 1,
      width: 1,
      price: 45000,
    },
    {
      materialTypeId: materialTypes['Камень'],
      brand: 'Grandex',
      calcType: CalcType.SQM,
      length: 1,
      width: 1,
      price: 60000,
    },
    // Кромка
    {
      materialTypeId: materialTypes['Кромка'],
      brand: 'Egger',
      calcType: CalcType.LM,
      length: 1,
      width: 1,
      price: 300,
    },
    {
      materialTypeId: materialTypes['Кромка'],
      brand: 'Rehau',
      calcType: CalcType.LM,
      length: 1,
      width: 1,
      price: 500,
    },
  ];

  for (const mat of materials) {
    const existing = await prisma.material.findFirst({
      where: { materialTypeId: mat.materialTypeId, brand: mat.brand },
    });
    if (!existing) {
      await prisma.material.create({ data: mat });
    }
  }
  console.log(`✅ Materials: ${materials.length}`);

  // ===========================
  // 7. Начальная фурнитура
  // ===========================
  const hardwareItems = [
    { hardwareTypeId: hardwareTypes['Петли'], brand: 'Blum', price: 1500 },
    { hardwareTypeId: hardwareTypes['Петли'], brand: 'GTV', price: 500 },
    { hardwareTypeId: hardwareTypes['Петли'], brand: 'Hettich', price: 1200 },
    {
      hardwareTypeId: hardwareTypes['Направляющие'],
      brand: 'Blum',
      price: 3500,
    },
    {
      hardwareTypeId: hardwareTypes['Направляющие'],
      brand: 'GTV',
      price: 1200,
    },
    {
      hardwareTypeId: hardwareTypes['Направляющие'],
      brand: 'Hettich',
      price: 3000,
    },
    {
      hardwareTypeId: hardwareTypes['Полкодержатели'],
      brand: 'GTV',
      price: 100,
    },
    {
      hardwareTypeId: hardwareTypes['Полкодержатели'],
      brand: 'Hettich',
      price: 200,
    },
    { hardwareTypeId: hardwareTypes['Тандем'], brand: 'Blum', price: 8000 },
    { hardwareTypeId: hardwareTypes['Тандем'], brand: 'Hettich', price: 6000 },
    { hardwareTypeId: hardwareTypes['Ножки'], brand: 'GTV', price: 300 },
    { hardwareTypeId: hardwareTypes['Ножки'], brand: 'Hettich', price: 600 },
    { hardwareTypeId: hardwareTypes['Ручки'], brand: 'Boyard', price: 800 },
    { hardwareTypeId: hardwareTypes['Ручки'], brand: 'GTV', price: 400 },
    { hardwareTypeId: hardwareTypes['Ручки'], brand: 'Gamet', price: 1500 },
    { hardwareTypeId: hardwareTypes['Конфирмат'], brand: 'GTV', price: 20 },
    { hardwareTypeId: hardwareTypes['Tip-On'], brand: 'Blum', price: 1200 },
    { hardwareTypeId: hardwareTypes['Tip-On'], brand: 'GTV', price: 500 },
    { hardwareTypeId: hardwareTypes['Tip-On'], brand: 'Hettich', price: 900 },
  ];

  for (const hw of hardwareItems) {
    const existing = await prisma.hardware.findFirst({
      where: { hardwareTypeId: hw.hardwareTypeId, brand: hw.brand },
    });
    if (!existing) {
      await prisma.hardware.create({ data: hw });
    }
  }
  console.log(`✅ Hardware: ${hardwareItems.length}`);

  // ===========================
  // 8. Шаблон услуг
  // ===========================
  const existingTemplate = await prisma.serviceTemplate.findFirst();
  if (!existingTemplate) {
    await prisma.serviceTemplate.create({
      data: {
        sawingPrice: 5000, // Распил — цена за лист
        drillingPrice: 3000, // Присадка — цена за лист
        edgeBandingPrice: 300, // Кромка — цена за м.п.
        technologistPercent: 5, // Технолог 5%
        designerPercent: 5, // Дизайнер 5%
        assemblyPercent: 10, // Сборка+монтаж 10%
        deliveryPrice: 30000, // Доставка — за 1 ед.
        profitType: ProfitType.COEF,
        profitValue: 1.5,
      },
    });
    console.log('✅ Service template created');
  }

  // ===========================
  // 9. Копия справочника для super admin
  // ===========================
  await copySettingsToUser(superAdmin.id);
  console.log('✅ Settings copied to super admin');

  console.log('🎉 Seed completed!');
}

/**
 * Копирует текущий справочник (материалы, фурнитуру, услуги) пользователю.
 * Вызывается при регистрации каждого нового пользователя.
 */
async function copySettingsToUser(userId: string) {
  // Копируем материалы
  const materials = await prisma.material.findMany();
  for (const mat of materials) {
    await prisma.userMaterial.upsert({
      where: { userId_materialId: { userId, materialId: mat.id } },
      update: {},
      create: {
        userId,
        materialId: mat.id,
        price: mat.price,
      },
    });
  }

  // Копируем фурнитуру
  const hardware = await prisma.hardware.findMany();
  for (const hw of hardware) {
    await prisma.userHardware.upsert({
      where: { userId_hardwareId: { userId, hardwareId: hw.id } },
      update: {},
      create: {
        userId,
        hardwareId: hw.id,
        price: hw.price,
      },
    });
  }

  // Копируем услуги
  const template = await prisma.serviceTemplate.findFirst();
  if (template) {
    await prisma.userService.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        sawingPrice: template.sawingPrice,
        drillingPrice: template.drillingPrice,
        edgeBandingPrice: template.edgeBandingPrice,
        technologistPercent: template.technologistPercent,
        designerPercent: template.designerPercent,
        assemblyPercent: template.assemblyPercent,
        deliveryPrice: template.deliveryPrice,
        profitType: template.profitType,
        profitValue: template.profitValue,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
