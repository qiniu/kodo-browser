@echo off
setlocal

set "script_dir=%~dp0"

echo Set oShell = CreateObject("WScript.Shell") > %temp%\shortcut.vbs
echo sLinkFile = "%userprofile%\Desktop\Kodo Browser(no sandbox).lnk" >> %temp%\shortcut.vbs
echo Set oLink = oShell.CreateShortcut(sLinkFile) >> %temp%\shortcut.vbs
echo oLink.TargetPath = "%script_dir%\Kodo Browser.exe" >> %temp%\shortcut.vbs
echo oLink.Arguments = "--no-sandbox" >> %temp%\shortcut.vbs
echo oLink.Save >> %temp%\shortcut.vbs
cscript //nologo %temp%\shortcut.vbs "%script_dir%"
del %temp%\shortcut.vbs