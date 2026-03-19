import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/database';
import User from '../src/models/User';
import Class from '../src/models/Class';
import Child from '../src/models/Child';
import StaffAssignment from '../src/models/StaffAssignment';
import Guardian from '../src/models/Guardian';
import PickupPerson from '../src/models/PickupPerson';
import DailyReport from '../src/models/DailyReport';
import Activity from '../src/models/Activity';
import ReportPhoto from '../src/models/ReportPhoto';
import Attendance from '../src/models/Attendance';
import CalendarEvent from '../src/models/CalendarEvent';
import Invoice from '../src/models/Invoice';
import Payment from '../src/models/Payment';
import ExpenseCategory from '../src/models/ExpenseCategory';
import Expense from '../src/models/Expense';
import Message from '../src/models/Message';
import MonthlyReport from '../src/models/MonthlyReport';

dotenv.config();

const TEST_PASSWORD = 'test1234';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Class.deleteMany({}),
      Child.deleteMany({}),
      StaffAssignment.deleteMany({}),
      Guardian.deleteMany({}),
      PickupPerson.deleteMany({}),
      DailyReport.deleteMany({}),
      Activity.deleteMany({}),
      ReportPhoto.deleteMany({}),
      Attendance.deleteMany({}),
      CalendarEvent.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      ExpenseCategory.deleteMany({}),
      Expense.deleteMany({}),
      Message.deleteMany({}),
      MonthlyReport.deleteMany({})
    ]);
    console.log('✅ Existing data cleared\n');
    
    // 1. Create Users
    console.log('👥 Creating users...');
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@daycare.com',
      password: TEST_PASSWORD,
      role: 'administrador',
      phone: '+5511999999999',
      status: 'active',
      emailVerified: true
    });
    
    const staff1 = await User.create({
      firstName: 'Maria',
      lastName: 'Educadora',
      email: 'maria@daycare.com',
      password: TEST_PASSWORD,
      role: 'staff',
      phone: '+5511888888888',
      status: 'active',
      emailVerified: true
    });
    
    const staff2 = await User.create({
      firstName: 'João',
      lastName: 'Professor',
      email: 'joao@daycare.com',
      password: TEST_PASSWORD,
      role: 'staff',
      phone: '+5511777777777',
      status: 'active',
      emailVerified: true
    });
    
    const responsavel1 = await User.create({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana.silva@example.com',
      password: TEST_PASSWORD,
      role: 'responsavel',
      phone: '+5511666666666',
      status: 'active',
      emailVerified: true
    });
    
    const responsavel2 = await User.create({
      firstName: 'Carlos',
      lastName: 'Santos',
      email: 'carlos.santos@example.com',
      password: TEST_PASSWORD,
      role: 'responsavel',
      phone: '+5511555555555',
      status: 'active',
      emailVerified: true
    });
    
    const responsavel3 = await User.create({
      firstName: 'Patricia',
      lastName: 'Oliveira',
      email: 'patricia.oliveira@example.com',
      password: TEST_PASSWORD,
      role: 'responsavel',
      phone: '+5511444444444',
      status: 'active',
      emailVerified: true
    });
    
    console.log(`✅ Created ${6} users\n`);
    
    // 2. Create Classes
    console.log('🏫 Creating classes...');
    const berçario = await Class.create({
      name: 'Berçário A',
      min_age_months: 0,
      max_age_months: 12,
      capacity: 10
    });
    
    const maternal1 = await Class.create({
      name: 'Maternal I',
      min_age_months: 12,
      max_age_months: 24,
      capacity: 12
    });
    
    const maternal2 = await Class.create({
      name: 'Maternal II',
      min_age_months: 24,
      max_age_months: 36,
      capacity: 15
    });
    
    const jardim1 = await Class.create({
      name: 'Jardim I',
      min_age_months: 36,
      max_age_months: 48,
      capacity: 18
    });
    
    const jardim2 = await Class.create({
      name: 'Jardim II',
      min_age_months: 48,
      max_age_months: 60,
      capacity: 20
    });
    
    console.log(`✅ Created ${5} classes\n`);
    
    // 3. Create Staff Assignments
    console.log('👨‍🏫 Creating staff assignments...');
    await StaffAssignment.create({
      staff_id: staff1._id,
      class_id: berçario._id
    });
    
    await StaffAssignment.create({
      staff_id: staff1._id,
      class_id: maternal1._id
    });
    
    await StaffAssignment.create({
      staff_id: staff2._id,
      class_id: maternal2._id
    });
    
    await StaffAssignment.create({
      staff_id: staff2._id,
      class_id: jardim1._id
    });
    
    console.log(`✅ Created ${4} staff assignments\n`);
    
    // 4. Create Children
    console.log('👶 Creating children...');
    const child1 = await Child.create({
      name: 'Lucas Silva',
      birth_date: new Date('2023-06-15'),
      class_id: berçario._id,
      parent_id: responsavel1._id,
      gender: 'Masculino',
      allergies: 'Nenhuma',
      medications: '',
      emergency_contact_name: 'Ana Silva',
      emergency_contact_phone: '+5511666666666',
      nationality: 'Brasileira',
      address: 'Rua das Flores, 123',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: new Date('2024-01-15')
    });
    
    const child2 = await Child.create({
      name: 'Sofia Santos',
      birth_date: new Date('2022-03-20'),
      class_id: maternal1._id,
      parent_id: responsavel2._id,
      gender: 'Feminino',
      allergies: 'Lactose',
      medications: '',
      emergency_contact_name: 'Carlos Santos',
      emergency_contact_phone: '+5511555555555',
      nationality: 'Brasileira',
      address: 'Avenida Principal, 456',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: new Date('2024-02-01')
    });
    
    const child3 = await Child.create({
      name: 'Pedro Oliveira',
      birth_date: new Date('2021-09-10'),
      class_id: maternal2._id,
      parent_id: responsavel3._id,
      gender: 'Masculino',
      allergies: 'Nenhuma',
      medications: '',
      emergency_contact_name: 'Patricia Oliveira',
      emergency_contact_phone: '+5511444444444',
      nationality: 'Brasileira',
      address: 'Rua dos Pássaros, 789',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: new Date('2023-08-15')
    });
    
    const child4 = await Child.create({
      name: 'Isabella Silva',
      birth_date: new Date('2020-11-25'),
      class_id: jardim1._id,
      parent_id: responsavel1._id,
      gender: 'Feminino',
      allergies: 'Nenhuma',
      medications: '',
      emergency_contact_name: 'Ana Silva',
      emergency_contact_phone: '+5511666666666',
      nationality: 'Brasileira',
      address: 'Rua das Flores, 123',
      languages_spoken: 'Português, Inglês',
      image_usage_authorized: true,
      enrollment_date: new Date('2023-01-10')
    });
    
    console.log(`✅ Created ${4} children\n`);
    
    // 5. Create Guardians
    console.log('👨‍👩‍👧 Creating guardians...');
    await Guardian.create({
      child_id: child1._id,
      name: 'Ana Silva',
      profession: 'Médica',
      workplace: 'Hospital Central',
      relationship: 'Mãe',
      phone: '+5511666666666',
      email: 'ana.silva@example.com',
      address: 'Rua das Flores, 123',
      guardian_type: 1
    });
    
    await Guardian.create({
      child_id: child1._id,
      name: 'Roberto Silva',
      profession: 'Engenheiro',
      workplace: 'Construtora XYZ',
      relationship: 'Pai',
      phone: '+5511999888777',
      email: 'roberto.silva@example.com',
      address: 'Rua das Flores, 123',
      guardian_type: 1
    });
    
    await Guardian.create({
      child_id: child2._id,
      name: 'Carlos Santos',
      profession: 'Advogado',
      workplace: 'Escritório Jurídico',
      relationship: 'Pai',
      phone: '+5511555555555',
      email: 'carlos.santos@example.com',
      address: 'Avenida Principal, 456',
      guardian_type: 1
    });
    
    await Guardian.create({
      child_id: child3._id,
      name: 'Patricia Oliveira',
      profession: 'Professora',
      workplace: 'Escola Municipal',
      relationship: 'Mãe',
      phone: '+5511444444444',
      email: 'patricia.oliveira@example.com',
      address: 'Rua dos Pássaros, 789',
      guardian_type: 1
    });
    
    console.log(`✅ Created ${4} guardians\n`);
    
    // 6. Create Pickup Persons
    console.log('🚗 Creating pickup persons...');
    await PickupPerson.create({
      child_id: child1._id,
      name: 'Tia Maria',
      relationship: 'Tia',
      phone: '+5511999777666',
      email: 'tia.maria@example.com',
      id_document: '12345678900',
      is_authorized: true
    });
    
    await PickupPerson.create({
      child_id: child2._id,
      name: 'Avó Rosa',
      relationship: 'Avó',
      phone: '+5511888777666',
      id_document: '98765432100',
      is_authorized: true
    });
    
    console.log(`✅ Created ${2} pickup persons\n`);
    
    // 7. Create Activities
    console.log('🎨 Creating activities...');
    const activity1 = await Activity.create({
      name: 'Brincadeira com blocos',
      description: 'Atividade de coordenação motora com blocos de madeira',
      class_id: berçario._id,
      age_group: '0-12 meses',
      duration_minutes: 30,
      materials_needed: ['Blocos de madeira', 'Tapete'],
      learning_objectives: ['Coordenação motora', 'Criatividade'],
      is_active: true
    });
    
    const activity2 = await Activity.create({
      name: 'Contação de histórias',
      description: 'Desenvolvimento da linguagem através de histórias',
      class_id: maternal1._id,
      age_group: '12-24 meses',
      duration_minutes: 20,
      materials_needed: ['Livros infantis', 'Fantoches'],
      learning_objectives: ['Linguagem', 'Imaginação'],
      is_active: true
    });
    
    console.log(`✅ Created ${2} activities\n`);
    
    // 8. Create Daily Reports
    console.log('📝 Creating daily reports...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const napStart1 = new Date(today);
    napStart1.setHours(13, 0, 0, 0);
    const napEnd1 = new Date(today);
    napEnd1.setHours(15, 0, 0, 0);
    
    const report1 = await DailyReport.create({
      child_id: child1._id,
      date: today,
      created_by: staff1._id,
      meals: {
        breakfast: 'Leite e biscoito',
        lunch: 'Arroz, feijão e frango',
        snack: 'Frutas',
        dinner: ''
      },
      activities: ['Brincadeira livre', 'Música'],
      nap_time: {
        start: napStart1,
        end: napEnd1,
        duration_minutes: 120
      },
      mood: 'Feliz',
      notes: 'Dia tranquilo, criança interagiu bem',
      behavior_notes: 'Boa interação com outras crianças',
      health_notes: ''
    });
    
    const napStart2 = new Date(today);
    napStart2.setHours(14, 0, 0, 0);
    const napEnd2 = new Date(today);
    napEnd2.setHours(16, 0, 0, 0);
    
    const report2 = await DailyReport.create({
      child_id: child2._id,
      date: today,
      created_by: staff1._id,
      meals: {
        breakfast: 'Leite e mingau',
        lunch: 'Sopa de legumes',
        snack: 'Iogurte',
        dinner: ''
      },
      activities: ['Contação de histórias', 'Brincadeira no parque'],
      nap_time: {
        start: napStart2,
        end: napEnd2,
        duration_minutes: 120
      },
      mood: 'Sonolento',
      notes: 'Criança um pouco sonolenta após o almoço',
      behavior_notes: 'Calma e tranquila',
      health_notes: ''
    });
    
    const report3 = await DailyReport.create({
      child_id: child3._id,
      date: yesterday,
      created_by: staff2._id,
      meals: {
        breakfast: 'Leite e pão',
        lunch: 'Arroz, feijão e carne',
        snack: 'Biscoito',
        dinner: ''
      },
      activities: ['Atividades físicas', 'Desenho'],
      mood: 'Alegre',
      notes: 'Muito ativo hoje',
      behavior_notes: 'Excelente participação',
      health_notes: ''
    });
    
    console.log(`✅ Created ${3} daily reports\n`);
    
    // 9. Create Report Photos
    console.log('📸 Creating report photos...');
    await ReportPhoto.create({
      daily_report_id: report1._id,
      photo_url: 'https://example.com/photos/report1.jpg',
      caption: 'Brincando no parque',
      uploaded_by: staff1._id
    });
    
    await ReportPhoto.create({
      daily_report_id: report2._id,
      photo_url: 'https://example.com/photos/report2.jpg',
      caption: 'Hora da soneca',
      uploaded_by: staff1._id
    });
    
    console.log(`✅ Created ${2} report photos\n`);
    
    // 10. Create Attendance
    console.log('✅ Creating attendance records...');
    const checkIn1 = new Date(today);
    checkIn1.setHours(8, 0, 0, 0);
    const checkOut1 = new Date(today);
    checkOut1.setHours(17, 0, 0, 0);
    
    await Attendance.create({
      child_id: child1._id,
      date: today,
      check_in: checkIn1,
      check_out: checkOut1,
      status: 'present',
      notes: '',
      recorded_by: staff1._id
    });
    
    const checkIn2 = new Date(today);
    checkIn2.setHours(8, 30, 0, 0);
    const checkOut2 = new Date(today);
    checkOut2.setHours(17, 30, 0, 0);
    
    await Attendance.create({
      child_id: child2._id,
      date: today,
      check_in: checkIn2,
      check_out: checkOut2,
      status: 'present',
      notes: '',
      recorded_by: staff1._id
    });
    
    const checkIn3 = new Date(today);
    checkIn3.setHours(7, 45, 0, 0);
    const checkOut3 = new Date(today);
    checkOut3.setHours(16, 30, 0, 0);
    
    await Attendance.create({
      child_id: child3._id,
      date: today,
      check_in: checkIn3,
      check_out: checkOut3,
      status: 'present',
      notes: '',
      recorded_by: staff2._id
    });
    
    const checkIn4 = new Date(today);
    checkIn4.setHours(8, 15, 0, 0);
    
    await Attendance.create({
      child_id: child4._id,
      date: today,
      check_in: checkIn4,
      status: 'late',
      notes: 'Chegou 15 minutos atrasado',
      recorded_by: staff2._id
    });
    
    console.log(`✅ Created ${4} attendance records\n`);
    
    // 11. Create Calendar Events
    console.log('📅 Creating calendar events...');
    await CalendarEvent.create({
      title: 'Festa de Aniversário Coletiva',
      description: 'Celebração dos aniversariantes do mês',
      start_date: new Date('2025-02-15T10:00:00Z'),
      end_date: new Date('2025-02-15T12:00:00Z'),
      is_all_day: false,
      event_type: 'activity',
      class_id: null,
      created_by: admin._id
    });
    
    await CalendarEvent.create({
      title: 'Reunião de Pais',
      description: 'Reunião mensal com os responsáveis',
      start_date: new Date('2025-02-20T19:00:00Z'),
      end_date: new Date('2025-02-20T21:00:00Z'),
      is_all_day: false,
      event_type: 'meeting',
      class_id: null,
      created_by: admin._id
    });
    
    await CalendarEvent.create({
      title: 'Feriado - Carnaval',
      description: 'Centro fechado',
      start_date: new Date('2025-03-03'),
      end_date: new Date('2025-03-05'),
      is_all_day: true,
      event_type: 'holiday',
      class_id: null,
      created_by: admin._id
    });
    
    console.log(`✅ Created ${3} calendar events\n`);
    
    // 12. Create Invoices
    console.log('💰 Creating invoices...');
    const invoice1 = await Invoice.create({
      invoice_number: 'INV-2025-0001',
      child_id: child1._id,
      parent_id: responsavel1._id,
      issue_date: new Date('2025-01-01'),
      due_date: new Date('2025-01-31'),
      amount: 500.00,
      status: 'pending',
      items: [
        {
          description: 'Mensalidade Janeiro 2025',
          quantity: 1,
          unit_price: 500.00,
          total: 500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });
    
    const invoice2 = await Invoice.create({
      invoice_number: 'INV-2025-0002',
      child_id: child2._id,
      parent_id: responsavel2._id,
      issue_date: new Date('2025-01-01'),
      due_date: new Date('2025-01-31'),
      amount: 500.00,
      status: 'pending',
      items: [
        {
          description: 'Mensalidade Janeiro 2025',
          quantity: 1,
          unit_price: 500.00,
          total: 500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });
    
    const invoice3 = await Invoice.create({
      invoice_number: 'INV-2025-0003',
      child_id: child3._id,
      parent_id: responsavel3._id,
      issue_date: new Date('2025-01-01'),
      due_date: new Date('2025-01-31'),
      amount: 500.00,
      status: 'paid',
      items: [
        {
          description: 'Mensalidade Janeiro 2025',
          quantity: 1,
          unit_price: 500.00,
          total: 500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });
    
    console.log(`✅ Created ${3} invoices\n`);
    
    // 13. Create Payments
    console.log('💳 Creating payments...');
    await Payment.create({
      invoice_id: invoice3._id,
      parent_id: responsavel3._id,
      child_id: child3._id,
      amount: 500.00,
      payment_date: new Date('2025-01-10'),
      payment_method: 'bank_transfer',
      payment_method_details: 'Transferência bancária',
      reference_number: 'TXN123456',
      notes: 'Pagamento em dia',
      recorded_by: admin._id
    });
    
    await Payment.create({
      invoice_id: invoice1._id,
      parent_id: responsavel1._id,
      child_id: child1._id,
      amount: 250.00,
      payment_date: new Date('2025-01-15'),
      payment_method: 'cash',
      reference_number: '',
      notes: 'Parcial',
      recorded_by: admin._id
    });
    
    console.log(`✅ Created ${2} payments\n`);
    
    // 14. Create Expense Categories
    console.log('📂 Creating expense categories...');
    const catLimpeza = await ExpenseCategory.create({
      name: 'Material de Limpeza',
      description: 'Produtos de limpeza e higiene',
      is_active: true
    });
    
    const catAlimentacao = await ExpenseCategory.create({
      name: 'Alimentação',
      description: 'Alimentos e bebidas',
      is_active: true
    });
    
    const catMaterial = await ExpenseCategory.create({
      name: 'Material Pedagógico',
      description: 'Materiais para atividades educacionais',
      is_active: true
    });
    
    const catManutencao = await ExpenseCategory.create({
      name: 'Manutenção',
      description: 'Reparos e manutenção',
      is_active: true
    });
    
    console.log(`✅ Created ${4} expense categories\n`);
    
    // 15. Create Expenses
    console.log('💸 Creating expenses...');
    await Expense.create({
      category_id: catLimpeza._id,
      amount: 150.00,
      description: 'Compra de material de limpeza',
      expense_date: new Date('2025-01-05'),
      receipt_url: 'https://example.com/receipts/001.pdf',
      vendor: 'Supermercado XYZ',
      recorded_by: admin._id
    });
    
    await Expense.create({
      category_id: catAlimentacao._id,
      amount: 300.00,
      description: 'Compra de alimentos para o mês',
      expense_date: new Date('2025-01-10'),
      receipt_url: 'https://example.com/receipts/002.pdf',
      vendor: 'Atacadista ABC',
      recorded_by: admin._id
    });
    
    await Expense.create({
      category_id: catMaterial._id,
      amount: 200.00,
      description: 'Material pedagógico',
      expense_date: new Date('2025-01-12'),
      vendor: 'Papelaria Educativa',
      recorded_by: admin._id
    });
    
    console.log(`✅ Created ${3} expenses\n`);
    
    // 16. Create Messages
    console.log('💬 Creating messages...');
    await Message.create({
      sender_id: admin._id,
      recipient_id: responsavel1._id,
      subject: 'Lembrete: Reunião de Pais',
      content: 'A reunião de pais será no dia 20/02 às 19h. Por favor, confirmar presença.',
      message_type: 'reminder',
      child_id: child1._id,
      is_read: false
    });
    
    await Message.create({
      sender_id: admin._id,
      recipient_role: 'responsavel',
      subject: 'Aviso: Feriado',
      content: 'Lembramos que nos dias 03, 04 e 05/03 o centro estará fechado devido ao feriado de Carnaval.',
      message_type: 'announcement',
      is_read: false
    });
    
    await Message.create({
      sender_id: responsavel1._id,
      recipient_id: staff1._id,
      subject: 'Dúvida sobre relatório',
      content: 'Gostaria de saber mais detalhes sobre o relatório mensal do Lucas.',
      message_type: 'direct',
      child_id: child1._id,
      is_read: true
    });
    
    console.log(`✅ Created ${3} messages\n`);
    
    // 17. Create Monthly Reports
    console.log('📊 Creating monthly reports...');
    await MonthlyReport.create({
      child_id: child1._id,
      month: 1,
      year: 2025,
      created_by: staff1._id,
      status: 'submitted',
      attendance_summary: {
        total_days: 22,
        present_days: 20,
        absent_days: 2,
        late_days: 0
      },
      physical_development: 'Desenvolvimento motor adequado para a idade',
      cognitive_development: 'Boa evolução cognitiva, demonstra curiosidade',
      social_development: 'Interage bem com outras crianças e adultos',
      emotional_development: 'Estável emocionalmente',
      general_notes: 'Ótimo mês de desenvolvimento',
      achievements: 'Aprendeu a sentar sozinho',
      areas_for_improvement: 'Continuar estimulando a fala'
    });
    
    await MonthlyReport.create({
      child_id: child2._id,
      month: 1,
      year: 2025,
      created_by: staff1._id,
      status: 'draft',
      attendance_summary: {
        total_days: 22,
        present_days: 21,
        absent_days: 1,
        late_days: 0
      },
      physical_development: 'Desenvolvimento normal',
      cognitive_development: 'Excelente desenvolvimento',
      social_development: 'Muito sociável',
      emotional_development: 'Calma e tranquila',
      general_notes: 'Em desenvolvimento',
      achievements: '',
      areas_for_improvement: ''
    });
    
    await MonthlyReport.create({
      child_id: child3._id,
      month: 1,
      year: 2025,
      created_by: staff2._id,
      status: 'validated',
      validated_by: admin._id,
      validated_at: new Date('2025-02-01'),
      attendance_summary: {
        total_days: 22,
        present_days: 22,
        absent_days: 0,
        late_days: 0
      },
      physical_development: 'Excelente desenvolvimento motor',
      cognitive_development: 'Muito criativo e participativo',
      social_development: 'Liderança natural',
      emotional_development: 'Muito alegre e expressivo',
      general_notes: 'Excelente mês',
      achievements: 'Aprendeu novas palavras e expressões',
      areas_for_improvement: 'Continuar estimulando'
    });
    
    console.log(`✅ Created ${3} monthly reports\n`);
    
    console.log('✅ Database seeding completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Users: 6 (1 admin, 2 staff, 3 responsáveis)`);
    console.log(`   - Classes: 5`);
    console.log(`   - Children: 4`);
    console.log(`   - Staff Assignments: 4`);
    console.log(`   - Guardians: 4`);
    console.log(`   - Pickup Persons: 2`);
    console.log(`   - Activities: 2`);
    console.log(`   - Daily Reports: 3`);
    console.log(`   - Report Photos: 2`);
    console.log(`   - Attendance Records: 4`);
    console.log(`   - Calendar Events: 3`);
    console.log(`   - Invoices: 3`);
    console.log(`   - Payments: 2`);
    console.log(`   - Expense Categories: 4`);
    console.log(`   - Expenses: 3`);
    console.log(`   - Messages: 3`);
    console.log(`   - Monthly Reports: 3\n`);
    console.log('🔑 All users have password: test1234\n');
    console.log('👤 Test Users:');
    console.log('   Admin: admin@daycare.com');
    console.log('   Staff 1: maria@daycare.com');
    console.log('   Staff 2: joao@daycare.com');
    console.log('   Responsável 1: ana.silva@example.com');
    console.log('   Responsável 2: carlos.santos@example.com');
    console.log('   Responsável 3: patricia.oliveira@example.com\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export default seedDatabase;
