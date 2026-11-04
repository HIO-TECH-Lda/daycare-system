# Payroll spreadsheet (tool, outside the system)

`gerador.py` builds `Sistema_Salarial_Centro_Infantil.xlsx`, a salary workbook for the centre's staff. It isn't part of the web app or the API; it was kept here from the start of the project. A payroll module in the system is a candidate for v2.

The workbook has five sheets:
- **Tabelas de Referência:** the IRPS brackets and INSS rates for 2024
- **Horas Extras**
- **Cálculo Mensal:** gross pay, INSS 3%, IRPS, net pay, employer INSS 7%, total cost
- **Provisionamentos**
- **Recibo de Vencimento**

```bash
pip install pandas xlsxwriter
python gerador.py        # writes Sistema_Salarial_Centro_Infantil.xlsx in the current folder
```

**Check the tax tables before using it for a real month.** They are the 2024 ones and change by law.
