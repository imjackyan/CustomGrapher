import re, time, json, argparse, sys, os

from jinja2 import Template

parser = argparse.ArgumentParser(description='Parsing ETL csv to produce html graph')
parser.add_argument('-t', '--template', type=str, default="template.html", help="Directory of the html template to use")
parser.add_argument('-o', '--out', type=str, default="out.html", help="Directory of the output html graph file")
parser.add_argument('-cpu', type=str, default="cpuTimes.csv", help="Directory of the input CPU file to parse (makes Line graph)")
parser.add_argument('-dma', type=str, default="dmaPackets_Complete.csv", help="Directory of the input DMA file to parse (makes Gantt graph)")

args = parser.parse_args()


def parseDMA(path):
    gantt = []
    with open(path, "r") as f:
        data = f.read().split("\n")
        ch_index = {}
        column_headers = data[0].split(",")
        for index, header in enumerate(column_headers):
            ch_index[header] = index;

        headers = ["engineType", "pid", "timeStart", "timeEnd", "processName"]
        hk = list(ch_index.keys())
        missing_headers  =[h for h in headers if h not in hk]
        if len(missing_headers) > 0:
            print("{} is missing column headers: {}".format(path, ", ".join(missing_headers)))
            return []


        for i, line in enumerate(data[1:]):
            vals = line.split(",")

            if len(vals) < 5:
                continue

            gantt.append(dict(
                category = vals[ch_index["engineType"]],
                pid = int(vals[ch_index["pid"]]),
                start = float(vals[ch_index["timeStart"]]),
                end = float(vals[ch_index["timeEnd"]]),
                pname = vals[ch_index["processName"]],
            ))
    return gantt

def parseCPU(path):
    lines = []
    c = 0
    with open(path, "r") as f:
        data = f.read().split("\n")
        ch_index = {}
        column_headers = data[0].split(",")
        for index, header in enumerate(column_headers):
            ch_index[header] = index;

        headers = ["TS", "CPU", "Proc", "Delta"]
        hk = list(ch_index.keys())
        missing_headers  =[h for h in headers if h not in hk]
        if len(missing_headers) > 0:
            print("{} is missing column headers: {}".format(path, ", ".join(missing_headers)))
            return []

        for i, line in enumerate(data[1:]):
            vals = line.split(",")

            if len(vals) < 4:
                continue

            cpu = int(vals[ch_index["CPU"]])
            while(len(lines) <= cpu):
                lines.append(dict(name="CPU {}".format(len(lines)), data=[]))

            lines[cpu]["data"].append(dict(
                x = float(vals[ch_index["TS"]]),
                y = float(vals[ch_index["Delta"]])
            ))
            if c != 0 and i > c:
                break
    # Sort
    for i,l in enumerate(lines):
        lines[i]["data"].sort(key=lambda d: d["x"])

    return lines

def inputExist(path):
    if not os.path.isfile(path):
        print("File: \"{}\" does not exist".format(path))
        return False
    return True

def main():
    exist = inputExist(args.cpu)
    exist != inputExist(args.dma)
    if not exist:
        return
    
    lines = parseCPU(args.cpu)
    gantt = parseDMA(args.dma)

    if len(lines) == 0 or len(gantt) == 0:
        print("[FAILED] Failed to parse")
        return


    t = Template(open(args.template).read())
    html = t.render(template={
        "gantt":gantt,
        "lines":lines
    })

    with open(args.out, 'w') as file:
        file.write(html)
    print("[SUCCESS] Graph written to {}".format(args.out))

main()