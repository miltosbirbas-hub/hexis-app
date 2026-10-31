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
!ifndef RTVER
  !define RTVER "dev"
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
  ; 1) ευγενικά: ο τοπικός server κλείνει μόνος του
  IfFileExists "$INSTDIR\python\python.exe" 0 +2
    nsExec::Exec '"$INSTDIR\python\python.exe" -c "import urllib.request as u; u.urlopen(u.Request(\"http://127.0.0.1:8765/api/shutdown\", data=b\"{}\", method=\"POST\"), timeout=3)"'
  Sleep 1500
  ; 2) ό,τι τρέχει ακόμα από τον φάκελο της εφαρμογής (παράθυρα, server, παλιές εκδόσεις) τερματίζεται,
  ;    αλλιώς τα αρχεία (π.χ. python3.dll) είναι κλειδωμένα και δεν αντικαθίστανται
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR\python\'; Get-Process | Where-Object { $$_.Path -and $$_.Path.StartsWith($$d, [StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force"`
  ; 3) και όσα έχουν φορτωμένη DLL από εκεί ή γραμμή εντολών μέσα στον φάκελο (π.χ. python από άλλη διαδρομή)
  nsExec::Exec `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR'; Get-CimInstance Win32_Process | Where-Object { ($$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$d, [StringComparison]::OrdinalIgnoreCase)) -or ($$_.CommandLine -and $$_.CommandLine.IndexOf($$d, [StringComparison]::OrdinalIgnoreCase) -ge 0) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-Process | Where-Object { try { $$_.Modules | Where-Object { $$_.FileName -and $$_.FileName.StartsWith($$d, [StringComparison]::OrdinalIgnoreCase) } } catch { $$false } } | Stop-Process -Force -ErrorAction SilentlyContinue"`
  Sleep 2000
!macroend

Function RunApp
  ExecShell "" "$INSTDIR\python\pythonw.exe" '"$INSTDIR\hexis_start.pyw"'
FunctionEnd

Section "HEXIS MAPPING" SEC1
  SectionIn RO
  !insertmacro STOPAPP
  SetOutPath "$INSTDIR"
  ; ίδιο περιβάλλον Python με το εγκατεστημένο: δεν ξαναγράφεται (καμία σύγκρουση με κλειδωμένα αρχεία)
  StrCpy $1 ""
  ClearErrors
  FileOpen $0 "$INSTDIR\python\rtver.txt" r
  IfErrors +3
    FileRead $0 $1
    FileClose $0
  StrCmp $1 "${RTVER}" py_done
  RMDir /r "$INSTDIR\python"
  ; αρχείο που μένει κλειδωμένο (π.χ. ucrtbase.dll από πρόγραμμα που δεν κλείνει): παραλείπεται αθόρυβα αντί για σφάλμα —
  ; είναι το ίδιο αρχείο συστήματος σε κάθε έκδοση
  SetOverwrite try
  File /r "${SRC}\python"
  SetOverwrite on
  py_done:
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
