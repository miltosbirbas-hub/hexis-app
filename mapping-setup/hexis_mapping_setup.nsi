; HEXIS MAPPING — εγκατάσταση στα Windows (χωρίς δικαιώματα διαχειριστή)
; Περιέχει το περιβάλλον (Python 3.12 + πακέτα) και την εκκίνηση. Την ίδια την εφαρμογή την κατεβάζει
; η πρώτη εκκίνηση, μετά από σύνδεση με τον λογαριασμό HEXIS ή κωδικό δωρεάν δοκιμής.
; Τα έργα μένουν στο Έγγραφα\HEXIS_MAPPING_DATA και ΔΕΝ σβήνονται ούτε στην απεγκατάσταση.
Unicode true
Target amd64-unicode
SetCompressor /SOLID lzma
SetCompressorDictSize 64
!include "MUI2.nsh"
!include "FileFunc.nsh"
!ifndef VERSION
  !define VERSION "1.0"
!endif
!define APP "HEXIS MAPPING"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\HEXIS_MAPPING"
Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\HEXIS MAPPING"
InstallDirRegKey HKCU "${UNKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "HEXIS-APP · hexis-app.gr"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "CompanyName" "BRB Development"
VIAddVersionKey "FileDescription" "${APP} — εγκατάσταση"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "BRB Development"
!define MUI_ICON "HEXIS_MAPPING.ico"
!define MUI_UNICON "HEXIS_MAPPING.ico"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Άνοιγμα της HEXIS MAPPING τώρα"
!define MUI_FINISHPAGE_RUN_FUNCTION RunApp
!define MUI_WELCOMEPAGE_TITLE "HEXIS MAPPING"
!define MUI_WELCOMEPAGE_TEXT "Θα εγκατασταθεί η HEXIS MAPPING και θα μπει εικονίδιο στην επιφάνεια εργασίας και στο μενού Έναρξη.$\r$\n$\r$\nΣτην πρώτη εκκίνηση συνδέεσαι με το email και τον κωδικό του λογαριασμού HEXIS (ή με κωδικό δωρεάν δοκιμής) και η εφαρμογή κατεβαίνει μόνη της.$\r$\n$\r$\nΤα έργα σου μένουν στο Έγγραφα\HEXIS_MAPPING_DATA."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Greek"

!macro STOPAPP
  IfFileExists "$INSTDIR\python\python.exe" 0 +2
    nsExec::Exec '"$INSTDIR\python\python.exe" -c "import urllib.request as u; u.urlopen(u.Request(\"http://127.0.0.1:8765/api/shutdown\", data=b\"{}\", method=\"POST\"), timeout=3)"'
  Sleep 1200
!macroend

Function RunApp
  ExecShell "" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\hexis_start.pyw"'
FunctionEnd

Section "HEXIS MAPPING" SEC1
  SectionIn RO
  !insertmacro STOPAPP
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\python"
  File /r "${SRC}\python"
  File "hexis_start.pyw"
  File "HEXIS_MAPPING.ico"
  File "HEXIS_MAPPING.png"
  ; η εφαρμογή (HEXIS_MAPPING\) μένει όπως είναι αν υπάρχει: αναβαθμίζεται από μέσα, με ένα κλικ
  CreateShortcut "$DESKTOP\HEXIS MAPPING.lnk" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\hexis_start.pyw"' "$INSTDIR\HEXIS_MAPPING.ico" 0 SW_SHOWNORMAL "" "HEXIS MAPPING"
  CreateDirectory "$SMPROGRAMS\HEXIS MAPPING"
  CreateShortcut "$SMPROGRAMS\HEXIS MAPPING\HEXIS MAPPING.lnk" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\hexis_start.pyw"' "$INSTDIR\HEXIS_MAPPING.ico" 0 SW_SHOWNORMAL "" "HEXIS MAPPING"
  CreateShortcut "$SMPROGRAMS\HEXIS MAPPING\Απεγκατάσταση HEXIS MAPPING.lnk" "$INSTDIR\Uninstall.exe"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "HEXIS MAPPING"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "BRB Development"
  WriteRegStr HKCU "${UNKEY}" "URLInfoAbout" "https://hexis-app.gr/mapping"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\HEXIS_MAPPING.ico"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" $0
SectionEnd

Section "Uninstall"
  !insertmacro STOPAPP
  Delete "$DESKTOP\HEXIS MAPPING.lnk"
  RMDir /r "$SMPROGRAMS\HEXIS MAPPING"
  RMDir /r "$INSTDIR\python"
  RMDir /r "$INSTDIR\HEXIS_MAPPING"
  Delete "$INSTDIR\hexis_start.pyw"
  Delete "$INSTDIR\HEXIS_MAPPING.ico"
  Delete "$INSTDIR\HEXIS_MAPPING.png"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
SectionEnd
