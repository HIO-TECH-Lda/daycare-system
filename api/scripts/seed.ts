/**
 * Database Seeder — Sonho de Criança
 *
 * Usage:
 *   npm run seed          → safe mode: skips if demo data already exists
 *   npm run seed:fresh    → drops all collections first, then seeds
 *
 * Demo credentials (all passwords: Demo@2026):
 *   admin@sonhodecrianca.mz     — Administrador
 *   maria@sonhodecrianca.mz     — Staff (Educadora)
 *   joao@sonhodecrianca.mz      — Staff (Professor)
 *   ana.silva@demo.com          — Responsável (2 filhos)
 *   carlos.santos@demo.com      — Responsável (1 filho)
 *   patricia.oliveira@demo.com  — Responsável (1 filho)
 */

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEMO_PASSWORD = 'Demo@2026';
const isFresh = process.argv.includes('--fresh');

/** Returns a Date set to the given hour/minute of today */
function todayAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Returns a Date N days relative to today */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** First day of current month */
function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const now = new Date();
const currentMonth = now.getMonth() + 1; // 1-12
const currentYear = now.getFullYear();
const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedDatabase() {
  try {
    console.log('\n🌱 Sonho de Criança — Database Seeder');
    console.log('─'.repeat(50));
    await connectDB();

    if (isFresh) {
      console.log('\n🗑️  --fresh flag detected — clearing all collections...');
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
      console.log('✅ Collections cleared\n');
    } else {
      // Safe mode: skip if demo admin already exists
      const existing = await User.findOne({ email: 'admin@sonhodecrianca.mz' });
      if (existing) {
        console.log('\n⚠️  Demo data already exists.');
        console.log('   Run  npm run seed:fresh  to wipe and re-seed.\n');
        await disconnectDB();
        return;
      }
    }

    // ── 1. Users ────────────────────────────────────────────────────────────
    console.log('👥 Creating users...');

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Sistema',
      email: 'admin@sonhodecrianca.mz',
      password: DEMO_PASSWORD,
      role: 'administrador',
      phone: '+258841000001',
      status: 'active',
      emailVerified: true
    });

    const staff1 = await User.create({
      firstName: 'Maria',
      lastName: 'Educadora',
      email: 'maria@sonhodecrianca.mz',
      password: DEMO_PASSWORD,
      role: 'staff',
      phone: '+258841000002',
      status: 'active',
      emailVerified: true
    });

    const staff2 = await User.create({
      firstName: 'João',
      lastName: 'Professor',
      email: 'joao@sonhodecrianca.mz',
      password: DEMO_PASSWORD,
      role: 'staff',
      phone: '+258841000003',
      status: 'active',
      emailVerified: true
    });

    const responsavel1 = await User.create({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana.silva@demo.com',
      password: DEMO_PASSWORD,
      role: 'responsavel',
      phone: '+258841000004',
      status: 'active',
      emailVerified: true
    });

    const responsavel2 = await User.create({
      firstName: 'Carlos',
      lastName: 'Santos',
      email: 'carlos.santos@demo.com',
      password: DEMO_PASSWORD,
      role: 'responsavel',
      phone: '+258841000005',
      status: 'active',
      emailVerified: true
    });

    const responsavel3 = await User.create({
      firstName: 'Patricia',
      lastName: 'Oliveira',
      email: 'patricia.oliveira@demo.com',
      password: DEMO_PASSWORD,
      role: 'responsavel',
      phone: '+258841000006',
      status: 'active',
      emailVerified: true
    });

    console.log('✅ 6 users created\n');

    // ── 2. Classes ──────────────────────────────────────────────────────────
    console.log('🏫 Creating classes...');

    const bercario = await Class.create({
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

    await Class.create({
      name: 'Jardim II',
      min_age_months: 48,
      max_age_months: 60,
      capacity: 20
    });

    console.log('✅ 5 classes created\n');

    // ── 3. Staff Assignments ─────────────────────────────────────────────────
    console.log('👨‍🏫 Creating staff assignments...');

    await StaffAssignment.create({ staff_id: staff1._id, class_id: bercario._id });
    await StaffAssignment.create({ staff_id: staff1._id, class_id: maternal1._id });
    await StaffAssignment.create({ staff_id: staff2._id, class_id: maternal2._id });
    await StaffAssignment.create({ staff_id: staff2._id, class_id: jardim1._id });

    console.log('✅ 4 staff assignments created\n');

    // ── 4. Children ──────────────────────────────────────────────────────────
    console.log('👶 Creating children...');

    const child1 = await Child.create({
      name: 'Lucas Silva',
      birth_date: daysFromNow(-270),    // ~9 months old
      class_id: bercario._id,
      parent_id: responsavel1._id,
      gender: 'Masculino',
      allergies: 'Nenhuma',
      emergency_contact_name: 'Ana Silva',
      emergency_contact_phone: '+258841000004',
      nationality: 'Moçambicana',
      address: 'Av. Eduardo Mondlane, 123, Maputo',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: daysFromNow(-60)
    });

    const child2 = await Child.create({
      name: 'Sofia Santos',
      birth_date: daysFromNow(-540),    // ~18 months old
      class_id: maternal1._id,
      parent_id: responsavel2._id,
      gender: 'Feminino',
      allergies: 'Intolerância à lactose',
      emergency_contact_name: 'Carlos Santos',
      emergency_contact_phone: '+258841000005',
      nationality: 'Moçambicana',
      address: 'Rua da Missão, 456, Maputo',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: daysFromNow(-90)
    });

    const child3 = await Child.create({
      name: 'Pedro Oliveira',
      birth_date: daysFromNow(-900),    // ~30 months old
      class_id: maternal2._id,
      parent_id: responsavel3._id,
      gender: 'Masculino',
      allergies: 'Nenhuma',
      emergency_contact_name: 'Patricia Oliveira',
      emergency_contact_phone: '+258841000006',
      nationality: 'Moçambicana',
      address: 'Av. 25 de Setembro, 789, Maputo',
      languages_spoken: 'Português',
      image_usage_authorized: true,
      enrollment_date: daysFromNow(-365)
    });

    const child4 = await Child.create({
      name: 'Isabella Silva',
      birth_date: daysFromNow(-1350),   // ~45 months old
      class_id: jardim1._id,
      parent_id: responsavel1._id,
      gender: 'Feminino',
      allergies: 'Nenhuma',
      emergency_contact_name: 'Ana Silva',
      emergency_contact_phone: '+258841000004',
      nationality: 'Moçambicana',
      address: 'Av. Eduardo Mondlane, 123, Maputo',
      languages_spoken: 'Português, Inglês',
      image_usage_authorized: true,
      enrollment_date: daysFromNow(-400)
    });

    console.log('✅ 4 children created\n');

    // ── 5. Guardians ─────────────────────────────────────────────────────────
    console.log('👨‍👩‍👧 Creating guardians...');

    await Guardian.create({
      child_id: child1._id,
      name: 'Ana Silva',
      profession: 'Médica',
      workplace: 'Hospital Central de Maputo',
      relationship: 'Mãe',
      phone: '+258841000004',
      email: 'ana.silva@demo.com',
      address: 'Av. Eduardo Mondlane, 123, Maputo',
      guardian_type: 1
    });

    await Guardian.create({
      child_id: child1._id,
      name: 'Roberto Silva',
      profession: 'Engenheiro',
      workplace: 'Construções do Sul',
      relationship: 'Pai',
      phone: '+258841000010',
      email: 'roberto.silva@demo.com',
      address: 'Av. Eduardo Mondlane, 123, Maputo',
      guardian_type: 1
    });

    await Guardian.create({
      child_id: child2._id,
      name: 'Carlos Santos',
      profession: 'Advogado',
      workplace: 'Escritório Jurídico Santos',
      relationship: 'Pai',
      phone: '+258841000005',
      email: 'carlos.santos@demo.com',
      address: 'Rua da Missão, 456, Maputo',
      guardian_type: 1
    });

    await Guardian.create({
      child_id: child3._id,
      name: 'Patricia Oliveira',
      profession: 'Professora',
      workplace: 'Escola Primária da Polana',
      relationship: 'Mãe',
      phone: '+258841000006',
      email: 'patricia.oliveira@demo.com',
      address: 'Av. 25 de Setembro, 789, Maputo',
      guardian_type: 1
    });

    console.log('✅ 4 guardians created\n');

    // ── 6. Pickup Persons ────────────────────────────────────────────────────
    console.log('🚗 Creating pickup persons...');

    await PickupPerson.create({
      child_id: child1._id,
      name: 'Tia Maria',
      relationship: 'Tia',
      phone: '+258841000020',
      email: 'tia.maria@demo.com',
      id_document: '12345678900',
      is_authorized: true
    });

    await PickupPerson.create({
      child_id: child2._id,
      name: 'Avó Rosa',
      relationship: 'Avó',
      phone: '+258841000021',
      id_document: '98765432100',
      is_authorized: true
    });

    console.log('✅ 2 pickup persons created\n');

    // ── 7. Activities ────────────────────────────────────────────────────────
    console.log('🎨 Creating activities...');

    await Activity.create({
      name: 'Brincadeira com blocos',
      description: 'Atividade de coordenação motora com blocos de madeira',
      class_id: bercario._id,
      age_group: '0-12 meses',
      duration_minutes: 30,
      materials_needed: ['Blocos de madeira', 'Tapete'],
      learning_objectives: ['Coordenação motora', 'Criatividade'],
      is_active: true
    });

    await Activity.create({
      name: 'Contação de histórias',
      description: 'Desenvolvimento da linguagem através de histórias',
      class_id: maternal1._id,
      age_group: '12-24 meses',
      duration_minutes: 20,
      materials_needed: ['Livros infantis', 'Fantoches'],
      learning_objectives: ['Linguagem', 'Imaginação'],
      is_active: true
    });

    await Activity.create({
      name: 'Pintura com dedos',
      description: 'Expressão artística e coordenação',
      class_id: maternal2._id,
      age_group: '24-36 meses',
      duration_minutes: 40,
      materials_needed: ['Tintas laváveis', 'Papel kraft'],
      learning_objectives: ['Criatividade', 'Expressão artística'],
      is_active: true
    });

    console.log('✅ 3 activities created\n');

    // ── 8. Daily Reports ─────────────────────────────────────────────────────
    console.log('📝 Creating daily reports...');

    const report1 = await DailyReport.create({
      child_id: child1._id,
      date: new Date(),
      created_by: staff1._id,
      meals: {
        breakfast: 'Leite e biscoito',
        lunch: 'Arroz, feijão e frango grelhado',
        snack: 'Banana e iogurte',
        dinner: ''
      },
      activities: ['Brincadeira com blocos', 'Música e movimento'],
      nap_time: {
        start: todayAt(13, 0),
        end: todayAt(15, 0),
        duration_minutes: 120
      },
      mood: 'Feliz',
      notes: 'Dia tranquilo, criança interagiu muito bem com os colegas.',
      behavior_notes: 'Boa interação social, sem intercorrências.',
      health_notes: ''
    });

    const report2 = await DailyReport.create({
      child_id: child2._id,
      date: new Date(),
      created_by: staff1._id,
      meals: {
        breakfast: 'Leite (sem lactose) e fruta',
        lunch: 'Sopa de legumes',
        snack: 'Iogurte de soja',
        dinner: ''
      },
      activities: ['Contação de histórias', 'Brincadeira no parque'],
      nap_time: {
        start: todayAt(14, 0),
        end: todayAt(16, 0),
        duration_minutes: 120
      },
      mood: 'Sonolento',
      notes: 'Um pouco sonolenta após o almoço, mas participou bem.',
      behavior_notes: 'Calma e tranquila.',
      health_notes: 'Reforçar dieta sem lactose conforme orientação dos pais.'
    });

    const report3 = await DailyReport.create({
      child_id: child3._id,
      date: daysFromNow(-1),
      created_by: staff2._id,
      meals: {
        breakfast: 'Leite e pão com manteiga',
        lunch: 'Arroz, feijão e carne assada',
        snack: 'Biscoito integral',
        dinner: ''
      },
      activities: ['Pintura com dedos', 'Exercícios físicos no pátio'],
      mood: 'Alegre',
      notes: 'Muito ativo e participativo hoje.',
      behavior_notes: 'Excelente participação em todas as atividades.',
      health_notes: ''
    });

    console.log('✅ 3 daily reports created\n');

    // ── 9. Report Photos ─────────────────────────────────────────────────────
    console.log('📸 Creating report photos...');

    await ReportPhoto.create({
      daily_report_id: report1._id,
      photo_url: 'https://placehold.co/800x600/f59e0b/fff?text=Lucas+brincando',
      caption: 'Lucas brincando com os blocos coloridos',
      uploaded_by: staff1._id
    });

    await ReportPhoto.create({
      daily_report_id: report2._id,
      photo_url: 'https://placehold.co/800x600/6366f1/fff?text=Sofia+soneca',
      caption: 'Hora da soneca da Sofia',
      uploaded_by: staff1._id
    });

    await ReportPhoto.create({
      daily_report_id: report3._id,
      photo_url: 'https://placehold.co/800x600/10b981/fff?text=Pedro+pintura',
      caption: 'Pedro na atividade de pintura',
      uploaded_by: staff2._id
    });

    console.log('✅ 3 report photos created\n');

    // ── 10. Attendance ───────────────────────────────────────────────────────
    console.log('✅ Creating attendance records...');

    // Today — present with check-in and check-out
    await Attendance.create({
      child_id: child1._id,
      date: new Date(),
      check_in: todayAt(7, 55),
      check_out: todayAt(17, 0),
      status: 'present',
      notes: '',
      recorded_by: staff1._id
    });

    await Attendance.create({
      child_id: child2._id,
      date: new Date(),
      check_in: todayAt(8, 10),
      check_out: todayAt(17, 30),
      status: 'present',
      notes: '',
      recorded_by: staff1._id
    });

    await Attendance.create({
      child_id: child3._id,
      date: new Date(),
      check_in: todayAt(7, 45),
      status: 'present',
      notes: '',
      recorded_by: staff2._id
    });

    await Attendance.create({
      child_id: child4._id,
      date: new Date(),
      check_in: todayAt(8, 20),
      status: 'late',
      notes: 'Chegou 20 minutos após o início das atividades.',
      recorded_by: staff2._id
    });

    // Yesterday — absent
    await Attendance.create({
      child_id: child3._id,
      date: daysFromNow(-1),
      status: 'absent',
      notes: 'Falta justificada por doença.',
      recorded_by: staff2._id
    });

    console.log('✅ 5 attendance records created\n');

    // ── 11. Calendar Events ──────────────────────────────────────────────────
    console.log('📅 Creating calendar events...');

    const nextWeekFriday = daysFromNow(7 - now.getDay() + 5);
    await CalendarEvent.create({
      title: 'Festa de Aniversários do Mês',
      description: 'Celebração coletiva dos aniversariantes. Pais são bem-vindos!',
      start_date: new Date(new Date(nextWeekFriday).setHours(10, 0, 0, 0)),
      end_date: new Date(new Date(nextWeekFriday).setHours(12, 0, 0, 0)),
      is_all_day: false,
      event_type: 'activity',
      created_by: admin._id
    });

    await CalendarEvent.create({
      title: 'Reunião de Pais e Responsáveis',
      description: 'Reunião mensal para acompanhamento do desenvolvimento das crianças.',
      start_date: new Date(new Date(daysFromNow(14)).setHours(18, 30, 0, 0)),
      end_date: new Date(new Date(daysFromNow(14)).setHours(20, 0, 0, 0)),
      is_all_day: false,
      event_type: 'meeting',
      created_by: admin._id
    });

    await CalendarEvent.create({
      title: 'Dia da Família — Gincana',
      description: 'Atividade ao ar livre com famílias.',
      start_date: daysFromNow(21),
      end_date: daysFromNow(21),
      is_all_day: true,
      event_type: 'activity',
      created_by: admin._id
    });

    await CalendarEvent.create({
      title: 'Formação de Educadores',
      description: 'Centro encerrado — formação interna da equipa.',
      start_date: daysFromNow(30),
      end_date: daysFromNow(30),
      is_all_day: true,
      event_type: 'holiday',
      created_by: admin._id
    });

    console.log('✅ 4 calendar events created\n');

    // ── 12. Invoices ─────────────────────────────────────────────────────────
    console.log('💰 Creating invoices...');

    const dueDate = new Date(startOfMonth());
    dueDate.setDate(10); // due on the 10th of current month

    const invoice1 = await Invoice.create({
      invoice_number: `INV-${currentYear}-0001`,
      child_id: child1._id,
      parent_id: responsavel1._id,
      issue_date: startOfMonth(),
      due_date: dueDate,
      amount: 4500.00,
      status: 'pending',
      items: [
        {
          description: `Mensalidade ${getMonthName(currentMonth)} ${currentYear}`,
          quantity: 1,
          unit_price: 4500.00,
          total: 4500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });

    await Invoice.create({
      invoice_number: `INV-${currentYear}-0002`,
      child_id: child4._id,
      parent_id: responsavel1._id,
      issue_date: startOfMonth(),
      due_date: dueDate,
      amount: 4500.00,
      status: 'pending',
      items: [
        {
          description: `Mensalidade ${getMonthName(currentMonth)} ${currentYear}`,
          quantity: 1,
          unit_price: 4500.00,
          total: 4500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });

    const invoice3 = await Invoice.create({
      invoice_number: `INV-${currentYear}-0003`,
      child_id: child2._id,
      parent_id: responsavel2._id,
      issue_date: startOfMonth(),
      due_date: dueDate,
      amount: 4500.00,
      status: 'paid',
      items: [
        {
          description: `Mensalidade ${getMonthName(currentMonth)} ${currentYear}`,
          quantity: 1,
          unit_price: 4500.00,
          total: 4500.00
        }
      ],
      notes: '',
      created_by: admin._id
    });

    const prevDueDate = new Date(currentYear, prevMonth - 1, 10);
    await Invoice.create({
      invoice_number: `INV-${prevMonthYear}-0004`,
      child_id: child3._id,
      parent_id: responsavel3._id,
      issue_date: new Date(prevMonthYear, prevMonth - 1, 1),
      due_date: prevDueDate,
      amount: 4500.00,
      status: 'overdue',
      items: [
        {
          description: `Mensalidade ${getMonthName(prevMonth)} ${prevMonthYear}`,
          quantity: 1,
          unit_price: 4500.00,
          total: 4500.00
        }
      ],
      notes: 'Fatura em atraso.',
      created_by: admin._id
    });

    console.log('✅ 4 invoices created\n');

    // ── 13. Payments ─────────────────────────────────────────────────────────
    console.log('💳 Creating payments...');

    await Payment.create({
      invoice_id: invoice3._id,
      parent_id: responsavel2._id,
      child_id: child2._id,
      amount: 4500.00,
      payment_date: new Date(new Date(startOfMonth()).setDate(5)),
      payment_method: 'bank_transfer',
      payment_method_details: 'Transferência bancária — BIM',
      reference_number: `TXN${currentYear}001`,
      notes: 'Pagamento na data prevista.',
      recorded_by: admin._id
    });

    // Partial payment on invoice1
    await Payment.create({
      invoice_id: invoice1._id,
      parent_id: responsavel1._id,
      child_id: child1._id,
      amount: 2000.00,
      payment_date: new Date(new Date(startOfMonth()).setDate(8)),
      payment_method: 'cash',
      reference_number: '',
      notes: 'Pagamento parcial.',
      recorded_by: admin._id
    });

    console.log('✅ 2 payments created\n');

    // ── 14. Expense Categories ───────────────────────────────────────────────
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

    const catPedagogico = await ExpenseCategory.create({
      name: 'Material Pedagógico',
      description: 'Materiais para atividades educacionais',
      is_active: true
    });

    await ExpenseCategory.create({
      name: 'Manutenção',
      description: 'Reparos e manutenção das instalações',
      is_active: true
    });

    await ExpenseCategory.create({
      name: 'Utilities',
      description: 'Água, energia e internet',
      is_active: true
    });

    console.log('✅ 5 expense categories created\n');

    // ── 15. Expenses ─────────────────────────────────────────────────────────
    console.log('💸 Creating expenses...');

    await Expense.create({
      category_id: catLimpeza._id,
      amount: 1500.00,
      description: 'Material de limpeza mensal',
      expense_date: new Date(new Date(startOfMonth()).setDate(3)),
      vendor: 'Supermercado Shoprite',
      recorded_by: admin._id
    });

    await Expense.create({
      category_id: catAlimentacao._id,
      amount: 8000.00,
      description: 'Compra mensal de alimentos',
      expense_date: new Date(new Date(startOfMonth()).setDate(2)),
      vendor: 'Makro Maputo',
      recorded_by: admin._id
    });

    await Expense.create({
      category_id: catPedagogico._id,
      amount: 2500.00,
      description: 'Tintas, papel e materiais para actividades do mês',
      expense_date: new Date(new Date(startOfMonth()).setDate(4)),
      vendor: 'Papelaria Central',
      recorded_by: admin._id
    });

    console.log('✅ 3 expenses created\n');

    // ── 16. Messages ─────────────────────────────────────────────────────────
    console.log('💬 Creating messages...');

    // Admin → responsavel1 (individual, unread)
    await Message.create({
      sender_id: admin._id,
      recipient_id: responsavel1._id,
      subject: 'Lembrete: Reunião de Pais',
      content: `Olá Ana,\n\nLembramos que a reunião de pais está agendada para daqui a 14 dias às 18h30. A sua presença é muito importante para acompanhar o desenvolvimento do Lucas e da Isabella.\n\nCumprimentos,\nEquipa Sonho de Criança`,
      message_type: 'reminder',
      child_id: child1._id,
      is_read: false
    });

    // Admin → all responsáveis (broadcast, unread)
    await Message.create({
      sender_id: admin._id,
      recipient_role: 'responsavel',
      subject: 'Informação: Novos horários de verão',
      content: `Caros responsáveis,\n\nInformamos que a partir do próximo mês o centro funcionará em horário alargado das 07h00 às 18h00.\n\nObrigado pela vossa compreensão.`,
      message_type: 'info',
      is_read: false
    });

    // responsavel1 → staff1 (read)
    await Message.create({
      sender_id: responsavel1._id,
      recipient_id: staff1._id,
      subject: 'Dúvida sobre o relatório do Lucas',
      content: `Olá Maria,\n\nGostaria de perceber melhor os detalhes do relatório diário do Lucas de ontem. Ele chegou a casa um pouco agitado.\n\nObrigada,\nAna`,
      message_type: 'general',
      child_id: child1._id,
      is_read: true
    });

    // staff1 → admin (alert)
    await Message.create({
      sender_id: staff1._id,
      recipient_id: admin._id,
      subject: 'Alerta: Material pedagógico em falta',
      content: `Bom dia,\n\nFicámos sem papel kraft e tintas para as actividades desta semana. Preciso de autorização para fazer uma compra urgente.\n\nMaria`,
      message_type: 'alert',
      is_read: false
    });

    console.log('✅ 4 messages created\n');

    // ── 17. Monthly Reports ──────────────────────────────────────────────────
    console.log('📊 Creating monthly reports...');

    // Previous month — validated (visible to responsavel)
    await MonthlyReport.create({
      child_id: child1._id,
      month: prevMonth,
      year: prevMonthYear,
      created_by: staff1._id,
      status: 'validated',
      validated_by: admin._id,
      validated_at: new Date(prevMonthYear, prevMonth - 1, 28),
      attendance_summary: {
        total_days: 22,
        present_days: 20,
        absent_days: 2,
        late_days: 0
      },
      physical_development: 'Desenvolvimento motor excelente para a faixa etária.',
      cognitive_development: 'Demonstra muita curiosidade e interesse no ambiente.',
      social_development: 'Interage bem com os educadores e colegas.',
      emotional_development: 'Estável e bem-humorado na maior parte do tempo.',
      general_notes: 'Excelente mês de adaptação e desenvolvimento.',
      achievements: 'Começou a dar os primeiros passos.',
      areas_for_improvement: 'Continuar a estimular a comunicação verbal.'
    });

    await MonthlyReport.create({
      child_id: child2._id,
      month: prevMonth,
      year: prevMonthYear,
      created_by: staff1._id,
      status: 'validated',
      validated_by: admin._id,
      validated_at: new Date(prevMonthYear, prevMonth - 1, 28),
      attendance_summary: {
        total_days: 22,
        present_days: 21,
        absent_days: 1,
        late_days: 0
      },
      physical_development: 'Desenvolvimento adequado.',
      cognitive_development: 'Excelente capacidade de atenção.',
      social_development: 'Muito sociável, faz amigos com facilidade.',
      emotional_development: 'Calma e tranquila.',
      general_notes: 'Muito bom mês.',
      achievements: 'Aprendeu a nomear 10 animais em português.',
      areas_for_improvement: 'Reforçar a dieta sem lactose com os pais.'
    });

    // Current month — draft (not yet visible to responsavel)
    await MonthlyReport.create({
      child_id: child3._id,
      month: currentMonth,
      year: currentYear,
      created_by: staff2._id,
      status: 'draft',
      attendance_summary: {
        total_days: now.getDate(),
        present_days: now.getDate() - 1,
        absent_days: 1,
        late_days: 0
      },
      physical_development: 'Excelente desenvolvimento motor.',
      cognitive_development: 'Criativo e muito participativo.',
      social_development: 'Liderança natural no grupo.',
      emotional_development: 'Alegre e expressivo.',
      general_notes: 'Em rascunho — aguarda revisão antes de submissão.',
      achievements: '',
      areas_for_improvement: ''
    });

    // Current month — submitted (awaiting admin validation)
    await MonthlyReport.create({
      child_id: child4._id,
      month: currentMonth,
      year: currentYear,
      created_by: staff2._id,
      status: 'submitted',
      attendance_summary: {
        total_days: now.getDate(),
        present_days: now.getDate() - 2,
        absent_days: 1,
        late_days: 1
      },
      physical_development: 'Desenvolvimento motor avançado para a idade.',
      cognitive_development: 'Muito curiosa, faz muitas perguntas.',
      social_development: 'Boa integração com o grupo.',
      emotional_development: 'Às vezes impaciente, mas melhora progressivamente.',
      general_notes: 'Aguarda validação pelo administrador.',
      achievements: 'Reconhece todas as letras do alfabeto.',
      areas_for_improvement: 'Trabalhar a paciência e a espera pela vez.'
    });

    console.log('✅ 4 monthly reports created\n');

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('─'.repeat(50));
    console.log('🎉 Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log('   Users              6   (1 admin · 2 staff · 3 responsáveis)');
    console.log('   Classes            5');
    console.log('   Staff assignments  4');
    console.log('   Children           4');
    console.log('   Guardians          4');
    console.log('   Pickup persons     2');
    console.log('   Activities         3');
    console.log('   Daily reports      3');
    console.log('   Report photos      3');
    console.log('   Attendance         5');
    console.log('   Calendar events    4');
    console.log('   Invoices           4   (pending · paid · overdue)');
    console.log('   Payments           2');
    console.log('   Expense categories 5');
    console.log('   Expenses           3');
    console.log('   Messages           4');
    console.log('   Monthly reports    4   (validated · draft · submitted)');
    console.log('\n🔑 Password for all accounts: ' + DEMO_PASSWORD);
    console.log('\n👤 Demo accounts:');
    console.log('   ┌──────────────────────────────────────┬──────────────────┐');
    console.log('   │ Email                                 │ Role             │');
    console.log('   ├──────────────────────────────────────┼──────────────────┤');
    console.log('   │ admin@sonhodecrianca.mz               │ Administrador    │');
    console.log('   │ maria@sonhodecrianca.mz               │ Staff            │');
    console.log('   │ joao@sonhodecrianca.mz                │ Staff            │');
    console.log('   │ ana.silva@demo.com                    │ Responsável      │');
    console.log('   │ carlos.santos@demo.com                │ Responsável      │');
    console.log('   │ patricia.oliveira@demo.com            │ Responsável      │');
    console.log('   └──────────────────────────────────────┴──────────────────┘\n');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}

function getMonthName(month: number): string {
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return names[month - 1] ?? String(month);
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
