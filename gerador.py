import pandas as pd

# File name for the complete system
file_name = "Sistema_Salarial_Centro_Infantil.xlsx"

# Initialize the writer with XlsxWriter engine
writer = pd.ExcelWriter(file_name, engine='xlsxwriter')
workbook = writer.book

# --- FORMATS ---
header_fmt = workbook.add_format({'bold': True, 'bg_color': '#2E7D32', 'font_color': 'white', 'border': 1, 'align': 'center'})
title_fmt = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': '#1B5E20'})
money_fmt = workbook.add_format({'num_format': '#,##0.00 "MT"', 'border': 1})
percent_fmt = workbook.add_format({'num_format': '0%', 'border': 1})
border_fmt = workbook.add_format({'border': 1})
total_fmt = workbook.add_format({'bold': True, 'bg_color': '#E8F5E9', 'border': 1, 'num_format': '#,##0.00 "MT"'})

# --- 1. SHEET: TABELAS DE REFERÊNCIA ---
ws_ref = workbook.add_worksheet('Tabelas de Referência')

# IRPS Table
ws_ref.write('A1', 'TABELA IRPS 2024 (Rendimento Anual)', title_fmt)
ref_headers = ['Faixa (MT)', 'Até', 'Taxa', 'Parcela a Deduzir']
for col, h in enumerate(ref_headers):
    ws_ref.write(2, col, h, header_fmt)

irps_data = [
    ['1ª Faixa', 42000, 0.0, 0],
    ['2ª Faixa', 168000, 0.10, 4200],
    ['3ª Faixa', 504000, 0.15, 12600],
    ['4ª Faixa', 1512000, 0.20, 37800],
    ['5ª Faixa', 4536000, 0.25, 94500],
    ['6ª Faixa', 'Acima', 0.32, 182952]
]
for row, row_data in enumerate(irps_data):
    ws_ref.write(3 + row, 0, row_data[0], border_fmt)
    ws_ref.write(3 + row, 1, row_data[1], border_fmt)
    ws_ref.write(3 + row, 2, row_data[2], percent_fmt)
    ws_ref.write(3 + row, 3, row_data[3], border_fmt)

# INSS and Parameters
ws_ref.write('A11', 'CONTRIBUIÇÕES INSS 2024', title_fmt)
ws_ref.write('A12', 'Trabalhador:', border_fmt)
ws_ref.write('B12', 0.03, percent_fmt)
ws_ref.write('A13', 'Entidade Patronal:', border_fmt)
ws_ref.write('B13', 0.07, percent_fmt)
ws_ref.write('A14', 'Teto Máximo:', border_fmt)
ws_ref.write('B14', 7000000, money_fmt)

ws_ref.write('A16', 'HORAS EXTRAS - TAXAS LEGAIS', title_fmt)
ws_ref.write('A17', 'Hora Extra Diurna:', border_fmt); ws_ref.write('B17', 1.5, percent_fmt)
ws_ref.write('A18', 'Hora Extra Noturna:', border_fmt); ws_ref.write('B18', 1.75, percent_fmt)
ws_ref.write('A19', 'Dias de Descanso:', border_fmt); ws_ref.write('B19', 2.0, percent_fmt)
ws_ref.write('A20', 'Feriados:', border_fmt); ws_ref.write('B20', 2.5, percent_fmt)

ws_ref.write('A22', 'CÁLCULO VALOR HORA NORMAL', title_fmt)
ws_ref.write('A23', 'Horas Semanais:', border_fmt); ws_ref.write('B23', 44, border_fmt)
ws_ref.write_formula('B24', '=B23*52/12', border_fmt)
ws_ref.write('A24', 'Horas Mensais (média):', border_fmt)

ws_ref.set_column('A:A', 25); ws_ref.set_column('B:D', 15)

# --- 2. SHEET: HORAS EXTRAS ---
ws_he = workbook.add_worksheet('Horas Extras')
ws_he.write('A1', 'CONTROLE DE HORAS EXTRAS', title_fmt)
he_headers = ['Funcionário', 'Horas Normais', 'Diurnas (150%)', 'Noturnas (175%)', 'Fim de Semana (200%)', 'Feriados (250%)', 'Total Horas', 'Valor Total HE (MT)']
for col, h in enumerate(he_headers):
    ws_he.write(2, col, h, header_fmt)

for i in range(20):
    row = 3 + i
    # Total Hours Formula
    ws_he.write_formula(row, 6, f'=SUM(C{row+1}:F{row+1})', border_fmt)
    # Total Value Formula using rates from reference sheet
    # (Diurnas * 1.5 + Noturnas * 1.75...) * (Base_Salary / Monthly_Hours)
    val_formula = (
        f'=(C{row+1}*1.5 + D{row+1}*1.75 + E{row+1}*2 + F{row+1}*2.5) * '
        f'(\'Cálculo Mensal\'!C{row+1}/\'Tabelas de Referência\'!$B$24)'
    )
    ws_he.write_formula(row, 7, val_formula, money_fmt)
    ws_he.write(row, 0, f'Funcionário {i+1}', border_fmt)
    for c in range(1, 6): ws_he.write(row, c, 0, border_fmt)

ws_he.set_column('A:A', 25); ws_he.set_column('B:H', 15)

# --- 3. SHEET: CÁLCULO MENSAL ---
ws_calc = workbook.add_worksheet('Cálculo Mensal')
ws_calc.write('A1', 'CONTROLE SALARIAL - CENTRO INFANTIL', title_fmt)
ws_calc.write('A2', 'Mês/Ano:', border_fmt); ws_calc.write('B2', 'Janeiro 2026', border_fmt)

main_headers = ['ID', 'Nome Completo', 'Salário Base (MT)', 'Horas Extras', 'Sub. Transporte', 'Sub. Alimentação', 'Outros', 'S. Bruto', 'INSS (3%)', 'Base IRPS', 'IRPS', 'S. Líquido', 'INSS Patronal (7%)', 'Custo Total']
for col, h in enumerate(main_headers):
    ws_calc.write(2, col, h, header_fmt)

for i in range(20):
    row = 3 + i
    idx = row + 1
    # Formulas
    ws_calc.write_formula(row, 7, f'=SUM(C{idx}:G{idx})', money_fmt) # Gross Salary
    ws_calc.write_formula(row, 8, f'=MIN(H{idx}*0.03, 7000000*0.03)', money_fmt) # INSS Emp
    ws_calc.write_formula(row, 9, f'=H{idx}-I{idx}', money_fmt) # Base IRPS
    
    # Complex IRPS Formula (nested IFs)
    irps_formula = (
        f'=IF(J{idx}*12<=42000, 0, '
        f'IF(J{idx}*12<=168000, (J{idx}*12-42000)*0.1/12, '
        f'IF(J{idx}*12<=504000, ((J{idx}*12-168000)*0.15+12600)/12, '
        f'IF(J{idx}*12<=1512000, ((J{idx}*12-504000)*0.2+37800)/12, '
        f'IF(J{idx}*12<=4536000, ((J{idx}*12-1512000)*0.25+94500)/12, '
        f'((J{idx}*12-4536000)*0.32+182952)/12)))))'
    )
    ws_calc.write_formula(row, 10, irps_formula, money_fmt) # IRPS
    ws_calc.write_formula(row, 11, f'=H{idx}-I{idx}-K{idx}', money_fmt) # Net
    ws_calc.write_formula(row, 12, f'=MIN(H{idx}*0.07, 7000000*0.07)', money_fmt) # INSS Pat
    ws_calc.write_formula(row, 13, f'=H{idx}+M{idx}', money_fmt) # Total Cost
    
    # Link Overtime from HE sheet
    ws_calc.write_formula(row, 3, f'=\'Horas Extras\'!H{idx}', money_fmt)
    
    # Sample Data
    ws_calc.write(row, 0, f'ID-{i+1:03}', border_fmt)
    ws_calc.write(row, 1, f'Funcionário {i+1}', border_fmt)
    ws_calc.write(row, 2, 15000 + (i*5000), money_fmt)
    ws_calc.write(row, 4, 1500, money_fmt)
    ws_calc.write(row, 5, 2000, money_fmt)
    ws_calc.write(row, 6, 0, money_fmt)

# Totals Row
ws_calc.write(23, 1, 'TOTAIS', header_fmt)
sum_cols = [2, 7, 8, 10, 11, 12, 13]
for c in sum_cols:
    ws_calc.write_formula(23, c, f'=SUM({chr(65+c)}4:{chr(65+c)}23)', total_fmt)

ws_calc.set_column('A:B', 20); ws_calc.set_column('C:N', 15)

# --- 4. SHEET: PROVISIONAMENTOS ---
ws_prov = workbook.add_worksheet('Provisionamentos')
ws_prov.write('A1', 'PROVISIONAMENTO 13º MÊS', title_fmt)
p_headers = ['Funcionário', 'Salário Base', 'Meses Trab.', 'Acumulado', 'A Pagar (Dez)']
for col, h in enumerate(p_headers): ws_prov.write(2, col, h, header_fmt)

for i in range(20):
    row = 3 + i
    ws_prov.write_formula(row, 0, f'=\'Cálculo Mensal\'!B{row+1}', border_fmt)
    ws_prov.write_formula(row, 1, f'=\'Cálculo Mensal\'!C{row+1}', money_fmt)
    ws_prov.write(row, 2, 12, border_fmt)
    ws_prov.write_formula(row, 3, f'=B{row+1}*C{row+1}/12', money_fmt)
    ws_prov.write_formula(row, 4, f'=D{row+1}', money_fmt)

ws_prov.write('G1', 'PROVISIONAMENTO FÉRIAS', title_fmt)
f_headers = ['Funcionário', 'Salário Base', 'Dias Férias', 'Valor Férias', 'Subsídio (1/3)', 'Total Férias']
for col, h in enumerate(f_headers): ws_prov.write(2, col + 6, h, header_fmt)

for i in range(20):
    row = 3 + i
    ws_prov.write_formula(row, 6, f'=\'Cálculo Mensal\'!B{row+1}', border_fmt)
    ws_prov.write_formula(row, 7, f'=\'Cálculo Mensal\'!C{row+1}', money_fmt)
    ws_prov.write(row, 8, 30, border_fmt)
    ws_prov.write_formula(row, 9, f'=H{row+1}*I{row+1}/30', money_fmt)
    ws_prov.write_formula(row, 10, f'=J{row+1}/3', money_fmt)
    ws_prov.write_formula(row, 11, f'=J{row+1}+K{row+1}', money_fmt)

ws_prov.set_column('A:L', 15)

# --- 5. SHEET: RECIBO DE VENCIMENTO ---
ws_rec = workbook.add_worksheet('Recibo de Vencimento')
ws_rec.write('A1', 'RECIBO DE VENCIMENTO', title_fmt)
ws_rec.write('A3', 'Empresa: Centro Infantil LÍRIO', border_fmt)
ws_rec.write('A4', 'Endereço: Chamba, Beira', border_fmt)
ws_rec.write('A5', 'NIF: 123456789', border_fmt)

# Link to the first employee as template
ws_rec.write('B3', 'Funcionário:', border_fmt); ws_rec.write_formula('C3', '=\'Cálculo Mensal\'!B4', border_fmt)
ws_rec.write('B4', 'Cargo:', border_fmt); ws_rec.write('C4', 'Especialista', border_fmt)
ws_rec.write('B7', 'Referente ao mês:', border_fmt); ws_rec.write_formula('C7', '=\'Cálculo Mensal\'!B2', border_fmt)

ws_rec.write(8, 0, 'DESCRIÇÃO', header_fmt); ws_rec.write(8, 2, 'VALORES (MT)', header_fmt)
items = [('Salário Base', 'C4'), ('Horas Extras', 'D4'), ('Subsídio Transporte', 'E4'), ('Subsídio Alimentação', 'F4'), ('Outros Adicionais', 'G4')]
for r, (label, cell) in enumerate(items):
    ws_rec.write(9 + r, 0, label, border_fmt)
    ws_rec.write_formula(9 + r, 2, f'=\'Cálculo Mensal\'!{cell}', money_fmt)

ws_rec.write(14, 0, 'TOTAL BRUTO', header_fmt); ws_rec.write_formula(14, 2, '=SUM(C10:C14)', total_fmt)

ws_rec.write(16, 0, 'DESCONTOS', header_fmt); ws_rec.write(16, 2, 'VALORES (MT)', header_fmt)
ws_rec.write(17, 0, 'INSS (3%)', border_fmt); ws_rec.write_formula(17, 2, '=\'Cálculo Mensal\'!I4', money_fmt)
ws_rec.write(18, 0, 'IRPS', border_fmt); ws_rec.write_formula(18, 2, '=\'Cálculo Mensal\'!K4', money_fmt)
ws_rec.write(19, 0, 'TOTAL DESCONTOS', header_fmt); ws_rec.write_formula(19, 2, '=SUM(C18:C19)', total_fmt)

ws_rec.write(21, 0, 'LÍQUIDO A RECEBER', title_fmt); ws_rec.write_formula(21, 2, '=C15-C20', total_fmt)

ws_rec.write('A24', 'Assinatura do Funcionário: ________________________')
ws_rec.write('C24', 'Carimbo e Assinatura da Entidade Patronal', workbook.add_format({'align': 'center'}))

ws_rec.set_column('A:A', 30); ws_rec.set_column('C:C', 20)

writer.close()
print(f"Sistema Salarial '{file_name}' gerado com sucesso.")