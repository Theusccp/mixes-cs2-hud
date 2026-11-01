$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class TheMaskKeyboard {
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll", SetLastError=true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
    [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx,dy; public uint mouseData,flags,time; public IntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort vk,scan; public uint flags,time; public IntPtr extra; }
    [StructLayout(LayoutKind.Explicit)] struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mouse; [FieldOffset(0)] public KEYBDINPUT keyboard; }
    [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public INPUTUNION data; }
    public static string Check() {
        IntPtr window=GetForegroundWindow();if(window==IntPtr.Zero)return "FOCUS_LOST";
        uint id;GetWindowThreadProcessId(window,out id);
        try{if(!Process.GetProcessById((int)id).ProcessName.Equals("cs2",StringComparison.OrdinalIgnoreCase))return "FOCUS_LOST";}
        catch{return "FOCUS_LOST";}
        foreach(int key in new int[]{16,17,18,91,92})if((GetAsyncKeyState(key)&0x8000)!=0)return "MODIFIER_HELD";
        return "READY";
    }
    public static string Press() {
        string check=Check();if(check!="READY")return check;
        INPUT[] inputs=new INPUT[2];
        inputs[0].type=1;inputs[0].data.keyboard.vk=0x79;
        inputs[1].type=1;inputs[1].data.keyboard.vk=0x79;inputs[1].data.keyboard.flags=2;
        return SendInput(2,inputs,Marshal.SizeOf(typeof(INPUT)))==2?"SENT":"INPUT_BLOCKED";
    }
}
'@
[Console]::WriteLine('{"ready":true}')
while ($null -ne ($requestLine = [Console]::ReadLine())) {
    try {
        $request = $requestLine | ConvertFrom-Json
        if ($request.action -eq 'check') { $resultCode = [TheMaskKeyboard]::Check() }
        elseif ($request.action -eq 'press') { $resultCode = [TheMaskKeyboard]::Press() }
        else { $resultCode = 'INVALID_ACTION' }
        [Console]::WriteLine((@{code=$resultCode} | ConvertTo-Json -Compress))
    } catch { [Console]::WriteLine('{"code":"BRIDGE_ERROR"}') }
}
