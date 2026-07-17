import sys
path = "C:/Users/LENOVO/Documents/跟单系统/frontend/src/Dashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
print(">平仓< exists:", ">平仓<" in content)
print("平仓 exists:", "平仓" in content)
