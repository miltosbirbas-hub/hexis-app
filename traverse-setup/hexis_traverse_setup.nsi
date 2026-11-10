; HEXIS TRAVERSE — εγκατάσταση στα Windows (χωρίς δικαιώματα διαχειριστή)
; Βάζει εικονίδιο στην επιφάνεια εργασίας και στο μενού Έναρξη. Η εφαρμογή ανοίγει σε δικό της παράθυρο
; (χωρίς γραμμή διευθύνσεων) και δουλεύει και χωρίς ίντερνετ μετά την πρώτη ενεργοποίηση με κλειδί.
Unicode true
Target amd64-unicode
SetCompressor /SOLID lzma
!include "MUI2.nsh"
!ifndef VERSION
  !define VERSION "1.0"
!endif
!define APP "HEXIS TRAVERSE"
!define URL "https://hexis-app.gr/traverse.html"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\HEXIS_TRAVERSE"
Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\HEXIS TRAVERSE"
InstallDirRegKey HKCU "${UNKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "HEXIS-APP · hexis-app.gr"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "CompanyName" "BRB Development"
VIAddVersionKey "FileDescription" "${APP} — εγκατάσταση"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "BRB Development"
!define MUI_ICON "HEXIS_TRAVERSE.ico"
!define MUI_UNICON "HEXIS_TRAVERSE.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Άνοιγμα του HEXIS TRAVERSE τώρα"
!define MUI_FINISHPAGE_RUN_FUNCTION RunApp
!define MUI_WELCOMEPAGE_TITLE "HEXIS TRAVERSE"
!define MUI_WELCOMEPAGE_TEXT "Θα εγκατασταθεί το HEXIS TRAVERSE (επίλυση όδευσης) με εικονίδιο στην επιφάνεια εργασίας και στο μενού Έναρξη.$\r$\n$\r$\nΣτην πρώτη εκκίνηση γράφεις το κλειδί άδειας που σου έστειλε η HEXIS-APP. Μετά δουλεύει και χωρίς ίντερνετ.$\r$\n$\r$\nΔεν χρειάζονται δικαιώματα διαχειριστή."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Greek"

Var BR
Var ARGS

; Βρίσκει τον browser που ανοίγει παράθυρο εφαρμογής (Edge, αλλιώς Chrome)
Function FindBrowser
  StrCpy $BR ""
  ReadRegStr $BR HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" ""
  StrCmp $BR "" 0 found
  ReadRegStr $BR HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" ""
  StrCmp $BR "" 0 found
  StrCpy $BR "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe"
  IfFileExists "$BR" found
  StrCpy $BR "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
  IfFileExists "$BR" found
  ReadRegStr $BR HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" ""
  StrCmp $BR "" 0 found
  ReadRegStr $BR HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" ""
  StrCmp $BR "" 0 found
  StrCpy $BR ""
  Return
  found:
  ; αφαιρεί τα εισαγωγικά, αν υπάρχουν
  StrCpy $0 $BR 1
  StrCmp $0 '"' 0 +2
  StrCpy $BR $BR -1 1
FunctionEnd

Function RunApp
  StrCmp $BR "" 0 +3
  ExecShell "open" "${URL}"
  Return
  Exec '"$BR" $ARGS'
FunctionEnd

Section "HEXIS TRAVERSE" SEC1
  SectionIn RO
  SetOutPath "$INSTDIR"
  File "HEXIS_TRAVERSE.ico"
  Call FindBrowser
  StrCpy $ARGS '--app=${URL} --start-maximized'
  Delete "$DESKTOP\HEXIS TRAVERSE.lnk"
  Delete "$DESKTOP\HEXIS TRAVERSE.url"
  CreateDirectory "$SMPROGRAMS\HEXIS TRAVERSE"
  StrCmp $BR "" noapp
    CreateShortcut "$DESKTOP\HEXIS TRAVERSE.lnk" "$BR" "$ARGS" "$INSTDIR\HEXIS_TRAVERSE.ico" 0 SW_SHOWMAXIMIZED "" "HEXIS TRAVERSE · επίλυση όδευσης"
    CreateShortcut "$SMPROGRAMS\HEXIS TRAVERSE\HEXIS TRAVERSE.lnk" "$BR" "$ARGS" "$INSTDIR\HEXIS_TRAVERSE.ico" 0 SW_SHOWMAXIMIZED "" "HEXIS TRAVERSE · επίλυση όδευσης"
    Goto done
  noapp:
    WriteINIStr "$INSTDIR\HEXIS TRAVERSE.url" "InternetShortcut" "URL" "${URL}"
    WriteINIStr "$INSTDIR\HEXIS TRAVERSE.url" "InternetShortcut" "IconFile" "$INSTDIR\HEXIS_TRAVERSE.ico"
    WriteINIStr "$INSTDIR\HEXIS TRAVERSE.url" "InternetShortcut" "IconIndex" "0"
    CopyFiles /SILENT "$INSTDIR\HEXIS TRAVERSE.url" "$DESKTOP"
    CopyFiles /SILENT "$INSTDIR\HEXIS TRAVERSE.url" "$SMPROGRAMS\HEXIS TRAVERSE"
  done:
  CreateShortcut "$SMPROGRAMS\HEXIS TRAVERSE\Απεγκατάσταση HEXIS TRAVERSE.lnk" "$INSTDIR\Uninstall.exe"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "HEXIS TRAVERSE"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "BRB Development"
  WriteRegStr HKCU "${UNKEY}" "URLInfoAbout" "https://hexis-app.gr"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\HEXIS_TRAVERSE.ico"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\HEXIS TRAVERSE.lnk"
  Delete "$DESKTOP\HEXIS TRAVERSE.url"
  RMDir /r "$SMPROGRAMS\HEXIS TRAVERSE"
  Delete "$INSTDIR\HEXIS_TRAVERSE.ico"
  Delete "$INSTDIR\HEXIS TRAVERSE.url"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
SectionEnd
