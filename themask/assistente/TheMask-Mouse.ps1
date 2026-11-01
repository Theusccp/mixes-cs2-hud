$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
public static class TheMaskOverlayInput {
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string c, string title);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint id);
    [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetLong64(IntPtr h, int i);
    [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetLong32(IntPtr h, int i);
    [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetLong64(IntPtr h, int i, IntPtr v);
    [DllImport("user32.dll", EntryPoint="SetWindowLongW")] static extern int SetLong32(IntPtr h, int i, int v);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int w, int height, uint flags);
    public static bool Apply() {
        IntPtr h=FindWindow(null,"JTs Hud Manager Overlay");
        if(h==IntPtr.Zero)return false;
        uint id; GetWindowThreadProcessId(h,out id);
        try { if(!Process.GetProcessById((int)id).ProcessName.Equals("JTs Hud Manager",StringComparison.OrdinalIgnoreCase))return false; }
        catch { return false; }
        long style=IntPtr.Size==8?GetLong64(h,-20).ToInt64():GetLong32(h,-20);
        long next=style|0x08000000L|0x00000020L; // NOACTIVATE and TRANSPARENT; keep existing flags.
        if(next!=style){
            if(IntPtr.Size==8)SetLong64(h,-20,new IntPtr(next));else SetLong32(h,-20,(int)next);
            SetWindowPos(h,IntPtr.Zero,0,0,0,0,0x0037); // no move/resize/z-order/activation.
        }
        if(GetForegroundWindow()==h)foreach(Process game in Process.GetProcessesByName("cs2")) {
            if(game.MainWindowHandle!=IntPtr.Zero){SetForegroundWindow(game.MainWindowHandle);break;}
        }
        return true;
    }
}
'@
$announced = $false
while ($true) {
    try {
        if ([TheMaskOverlayInput]::Apply() -and -not $announced) {
            Write-Host 'Janela JTs ajustada: cliques e teclado devem permanecer no CS2.'
            $announced = $true
        }
    } catch { }
    Start-Sleep -Seconds 1
}
