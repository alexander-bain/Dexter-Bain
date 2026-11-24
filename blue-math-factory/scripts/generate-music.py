from pathlib import Path
import math
import random
import struct
import wave

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "audio"
RATE = 22050
BEATS = 32
BPM = 112
SECONDS = BEATS * 60 / BPM

NOTES = {name: 440 * 2 ** ((midi - 69) / 12) for name, midi in {
    "C3":48,"D3":50,"E3":52,"F3":53,"G3":55,"A3":57,"B3":59,
    "C4":60,"D4":62,"E4":64,"F4":65,"G4":67,"A4":69,"B4":71,
    "C5":72,"D5":74,"E5":76,"G5":79
}.items()}

THEMES = {
    "hub": ["C4","E4","G4","E4","D4","G4","A4","G4","C4","E4","G4","C5","B4","A4","G4","E4"],
    "factory": ["C4","E4","G4","A4","G4","E4","D4","E4","F4","A4","C5","A4","G4","E4","D4","G4"],
    "store": ["E4","G4","A4","B4","A4","G4","E4","D4","F4","A4","C5","B4","A4","G4","E4","G4"],
    "math": ["C4","G4","E4","A4","D4","A4","F4","B4","E4","B4","G4","C5","G4","E4","D4","G4"]
}

def envelope(t, duration, attack=.03, release=.25):
    return min(1, t/attack) * min(1, max(0, duration-t)/release)

def tone(buffer, start, duration, frequency, volume, kind="bell"):
    begin = int(start*RATE); end = min(len(buffer), int((start+duration)*RATE))
    for i in range(begin,end):
        t=(i/RATE)-start
        env=envelope(t,duration)
        if kind == "bell":
            sample=math.sin(2*math.pi*frequency*t)+.32*math.sin(2*math.pi*frequency*2*t)*math.exp(-3*t)+.14*math.sin(2*math.pi*frequency*3*t)
        elif kind == "bass":
            sample=math.sin(2*math.pi*frequency*t)+.2*math.sin(2*math.pi*frequency*.5*t)
        else:
            sample=math.sin(2*math.pi*frequency*t)
        buffer[i]+=sample*volume*env

def noise_hit(buffer,start,volume):
    rng=random.Random(int(start*1000)+29)
    begin=int(start*RATE); duration=.07
    for i in range(begin,min(len(buffer),begin+int(duration*RATE))):
        t=(i-begin)/RATE
        buffer[i]+=(rng.random()*2-1)*volume*math.exp(-45*t)

def make(name, melody):
    length=int(SECONDS*RATE)
    data=[0.0]*length
    beat=60/BPM
    chords=[["C3","E3","G3"],["F3","A3","C4"],["A3","C4","E4"],["G3","B3","D4"]]
    for step,note in enumerate(melody*2):
        start=step*beat
        tone(data,start,beat*.82,NOTES[note],.14 if name!="math" else .17,"bell")
        if step%2==0:
            chord=chords[(step//8)%4]
            for chord_note in chord: tone(data,start,beat*1.8,NOTES[chord_note],.025,"sine")
        if step%4==0: tone(data,start,beat*3.7,NOTES[chords[(step//8)%4][0]]/2,.09,"bass")
        if name in ("factory","math"): noise_hit(data,start,.025)
        if name == "store" and step%2==1: noise_hit(data,start,.012)
    peak=max(max(data),-min(data),1)
    OUT.mkdir(parents=True,exist_ok=True)
    with wave.open(str(OUT/f"{name}.wav"),"wb") as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(RATE)
        for sample in data:
            value=int(max(-1,min(1,sample/peak*.82))*32767)
            output.writeframesraw(struct.pack("<h",value))

def main():
    for name,melody in THEMES.items(): make(name,melody)

if __name__ == "__main__": main()
