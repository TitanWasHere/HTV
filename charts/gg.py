import csv
import matplotlib.pyplot as plt
from datetime import datetime
from mpl_toolkits.axes_grid1 import host_subplot
import mpl_toolkits.axisartist as AA
import numpy as np
from scipy.interpolate import CubicSpline
days = []
rain = []
etcadj = []
irrigation = []
stress_idrico = []

with open("safe.csv", newline='', encoding='utf-8') as csvfile:
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
        stress_idrico.append(stress)

# Calculate initial Stress Idrico
Stress_Idrico = [0]  # Initialize with the first value
Irrigation = [0]
i = 1
while i < len(etcadj):
    if etcadj[i] > 2.5:
        new_value = Stress_Idrico[i-1] - 0.05
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

# Adjust for irrigation when Stress Idrico goes below -1


# Plotting the results
plt.figure(figsize=(14, 7))
plt.plot(days, rain, label='Pioggia (P)', color='blue')
plt.plot(days, etcadj, label='ETcadj', color='green')
#plt.plot(days, Stress_Idrico, label='Stress Idrico (Interpolato)', color='red')
#plt.plot(days, Irrigation, label='Irrigazione', color='orange')
#plt.axhline(y=-1, color='grey', linestyle='--', label='Irrigation Threshold')
plt.xlabel('Giorno')
plt.ylabel('Values')
plt.title('Rain and ETcadj values over time')
plt.legend()
plt.show()

# Return the calculated Stress Idrico values
Stress_Idrico