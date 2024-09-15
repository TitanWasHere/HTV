import csv
import matplotlib.pyplot as plt
from datetime import datetime
from mpl_toolkits.axes_grid1 import host_subplot
import mpl_toolkits.axisartist as AA
import numpy as np
from scipy.interpolate import CubicSpline

# Leggi il file CSV
file_path = 'safe.csv'
days = []
rain = []
etcadj = []
irrigation = []
stress_idrico = []

with open(file_path, newline='', encoding='utf-8') as csvfile:
    csvreader = csv.reader(csvfile, delimiter=',')
    next(csvreader)  # Salta la riga dell'intestazione
    next(csvreader)  # Salta la seconda riga dell'intestazione
    
    for row in csvreader:
        day = datetime.strptime(row[0], '%d/%m/%Y')
        p = float(row[1].replace(',', '.')) if row[1] else 0
        etc = float(row[4].replace(',', '.'))
        irr = float(row[6].replace(',', '.')) if row[6] else 0
        stress = float(row[5].replace(',', '.')) if row[5] else 0
        
        days.append(day)
        rain.append(p)
        etcadj.append(etc)
        irrigation.append(irr)
        stress_idrico.append(stress_idrico)

Stress_Idrico = [0]  # Initialize with the first value
Irrigation = [0]
i = 1
while i < len(etcadj):
    if etcadj[i] > 2.5:
        new_value = Stress_Idrico[i-1] - 0.05
        if rain[i] - etcadj[i] > 10:
            new_value = min(0, new_value + 0.2)
        irr_val = 0
        if new_value < -2:
            new_value = 0
            irr_val = 20
        Stress_Idrico.append(new_value)
        Irrigation.append(irr_val)
    else:
        Stress_Idrico.append(Stress_Idrico[i-1])  # Maintain the previous value if condition not met
        Irrigation.append(0)
    i += 1

# Converti le date in numeri per l'interpolazione
days_num = np.array([d.toordinal() for d in days])

# Crea l'interpolazione spline per stress idrico
cs = CubicSpline(days_num, Stress_Idrico)

# Crea valori interpolati per un grafico più liscio
days_interp = np.linspace(days_num.min(), days_num.max(), 500)
stress_idrico_interp = cs(days_interp)
days_interp_datetime = [datetime.fromordinal(int(day)) for day in days_interp]

# Creazione del grafico con quattro assi y
fig, host = plt.subplots()
fig.subplots_adjust(right=0.75)

par1 = host.twinx()
par2 = host.twinx()
par3 = host.twinx()

# Offset per il terzo asse y
par2.spines['right'].set_position(('outward', 60))      
par2.spines['right'].set_visible(True)

# Offset per il quarto asse y
par3.spines['right'].set_position(('outward', 120))
par3.spines['right'].set_visible(True)

# Grafico per la quantità di pioggia (P)
host.set_xlabel('Giorno')
host.set_ylabel('Pioggia (mm)', color='tab:blue')
p1, = host.plot(days, rain, color='tab:blue', label='Pioggia (P)')
host.tick_params(axis='y', labelcolor='tab:blue')
host.set_ylim(-5, 80) # Pioggia

# Grafico per ETcadj
par1.set_ylabel('ETcadj (mm)', color='tab:green')
p2, = par1.plot(days, etcadj, color='tab:green', label='ETcadj')
par1.tick_params(axis='y', labelcolor='tab:green')
par1.set_ylim(-5, 10) # ETcadj

# Grafico per Irrigazione
#par2.set_ylabel('Irrigazione (mm)', color='tab:orange')
#p3, = par2.plot(days, Irrigation, color='tab:orange', label='Irrigazione')
#par2.tick_params(axis='y', labelcolor='tab:orange')
#par2.set_ylim(-3, 50) # Irrigazione

# Grafico per Stress Idrico con interpolazione
#par3.set_ylabel('Stress Idrico (mm)', color='tab:red')
#p4, = par3.plot(days_interp_datetime, stress_idrico_interp, color='tab:red', label='Stress Idrico (Interpolato)')
#par3.tick_params(axis='y', labelcolor='tab:red')
#par3.set_ylim(-2, 1) # Stress Idrico

# Titolo del grafico
plt.title('Irrigation datas')

# Mostra la legenda
#lines = [p1, p2, p3, p4]
lines = [p1, p2]
host.legend(lines, [l.get_label() for l in lines])

# Mostra il grafico
plt.show()
