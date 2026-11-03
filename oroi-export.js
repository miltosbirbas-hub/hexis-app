/* =====================================================================
   HEXIS Νομοθεσία — «Όροι Δόμησης»: ΑΠΟΣΠΑΣΜΑ ΣΧΕΔΙΟΥ σε κλίμακα
   • PDF: απόσπασμα (σαρωμένο διάγραμμα ΦΕΚ + ψηφιοποιημένες γραμμές ΕΨΧ
     + περίγραμμα ΚΑΕΚ) σε πραγματική κλίμακα + όροι δόμησης αναλυτικά
   • ZIP για AutoCAD: DXF (ΕΓΣΑ'87, μέτρα) με layer PST_KAEK, γραμμές
     σχεδίου και γεωαναφερμένο TIFF (IMAGE στη σωστή θέση) + TFW
   Φορτώνεται μόνο όταν ζητηθεί εξαγωγή. Το DXF_TPL μπαίνει από το build.
===================================================================== */
(function(){
"use strict";
const DXF_TPL = {"tpl": "  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  9\n$ACADMAINTVER\n 70\n6\n  9\n$DWGCODEPAGE\n  3\nANSI_1252\n  9\n$INSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$EXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$EXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$LIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$LIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$ORTHOMODE\n 70\n0\n  9\n$REGENMODE\n 70\n1\n  9\n$FILLMODE\n 70\n1\n  9\n$QTEXTMODE\n 70\n0\n  9\n$MIRRTEXT\n 70\n1\n  9\n$LTSCALE\n 40\n1.0\n  9\n$ATTMODE\n 70\n1\n  9\n$TEXTSIZE\n 40\n2.5\n  9\n$TRACEWID\n 40\n1.0\n  9\n$TEXTSTYLE\n  7\nStandard\n  9\n$CLAYER\n  8\n0\n  9\n$CELTYPE\n  6\nByLayer\n  9\n$CECOLOR\n 62\n256\n  9\n$CELTSCALE\n 40\n1.0\n  9\n$DISPSILH\n 70\n0\n  9\n$DIMSCALE\n 40\n1.0\n  9\n$DIMASZ\n 40\n2.5\n  9\n$DIMEXO\n 40\n0.625\n  9\n$DIMDLI\n 40\n3.75\n  9\n$DIMRND\n 40\n0.0\n  9\n$DIMDLE\n 40\n0.0\n  9\n$DIMEXE\n 40\n1.25\n  9\n$DIMTP\n 40\n0.0\n  9\n$DIMTM\n 40\n0.0\n  9\n$DIMTXT\n 40\n2.5\n  9\n$DIMCEN\n 40\n2.5\n  9\n$DIMTSZ\n 40\n0.0\n  9\n$DIMTOL\n 70\n0\n  9\n$DIMLIM\n 70\n0\n  9\n$DIMTIH\n 70\n0\n  9\n$DIMTOH\n 70\n0\n  9\n$DIMSE1\n 70\n0\n  9\n$DIMSE2\n 70\n0\n  9\n$DIMTAD\n 70\n1\n  9\n$DIMZIN\n 70\n8\n  9\n$DIMBLK\n  1\n\n  9\n$DIMASO\n 70\n1\n  9\n$DIMSHO\n 70\n1\n  9\n$DIMPOST\n  1\n\n  9\n$DIMAPOST\n  1\n\n  9\n$DIMALT\n 70\n0\n  9\n$DIMALTD\n 70\n3\n  9\n$DIMALTF\n 40\n0.03937007874\n  9\n$DIMLFAC\n 40\n1.0\n  9\n$DIMTOFL\n 70\n1\n  9\n$DIMTVP\n 40\n0.0\n  9\n$DIMTIX\n 70\n0\n  9\n$DIMSOXD\n 70\n0\n  9\n$DIMSAH\n 70\n0\n  9\n$DIMBLK1\n  1\n\n  9\n$DIMBLK2\n  1\n\n  9\n$DIMSTYLE\n  2\nISO-25\n  9\n$DIMCLRD\n 70\n0\n  9\n$DIMCLRE\n 70\n0\n  9\n$DIMCLRT\n 70\n0\n  9\n$DIMTFAC\n 40\n1.0\n  9\n$DIMGAP\n 40\n0.625\n  9\n$DIMJUST\n 70\n0\n  9\n$DIMSD1\n 70\n0\n  9\n$DIMSD2\n 70\n0\n  9\n$DIMTOLJ\n 70\n0\n  9\n$DIMTZIN\n 70\n8\n  9\n$DIMALTZ\n 70\n0\n  9\n$DIMALTTZ\n 70\n0\n  9\n$DIMUPT\n 70\n0\n  9\n$DIMDEC\n 70\n2\n  9\n$DIMTDEC\n 70\n2\n  9\n$DIMALTU\n 70\n2\n  9\n$DIMALTTD\n 70\n3\n  9\n$DIMTXSTY\n  7\nStandard\n  9\n$DIMAUNIT\n 70\n0\n  9\n$DIMADEC\n 70\n0\n  9\n$DIMALTRND\n 40\n0.0\n  9\n$DIMAZIN\n 70\n0\n  9\n$DIMDSEP\n 70\n44\n  9\n$DIMATFIT\n 70\n3\n  9\n$DIMFRAC\n 70\n0\n  9\n$DIMLDRBLK\n  1\n\n  9\n$DIMLUNIT\n 70\n2\n  9\n$DIMLWD\n 70\n-2\n  9\n$DIMLWE\n 70\n-2\n  9\n$DIMTMOVE\n 70\n0\n  9\n$LUNITS\n 70\n2\n  9\n$LUPREC\n 70\n4\n  9\n$SKETCHINC\n 40\n1.0\n  9\n$FILLETRAD\n 40\n10.0\n  9\n$AUNITS\n 70\n0\n  9\n$AUPREC\n 70\n2\n  9\n$MENU\n  1\n.\n  9\n$ELEVATION\n 40\n0.0\n  9\n$PELEVATION\n 40\n0.0\n  9\n$THICKNESS\n 40\n0.0\n  9\n$LIMCHECK\n 70\n0\n  9\n$CHAMFERA\n 40\n0.0\n  9\n$CHAMFERB\n 40\n0.0\n  9\n$CHAMFERC\n 40\n0.0\n  9\n$CHAMFERD\n 40\n0.0\n  9\n$SKPOLY\n 70\n0\n  9\n$TDCREATE\n 40\n2461348.6308680554\n  9\n$TDUCREATE\n 40\n2458532.153996898\n  9\n$TDUPDATE\n 40\n2461348.6308680554\n  9\n$TDUUPDATE\n 40\n2458532.1544311\n  9\n$TDINDWG\n 40\n0.0\n  9\n$TDUSRTIMER\n 40\n0.0\n  9\n$USRTIMER\n 70\n1\n  9\n$ANGBASE\n 50\n0.0\n  9\n$ANGDIR\n 70\n0\n  9\n$PDMODE\n 70\n0\n  9\n$PDSIZE\n 40\n0.0\n  9\n$PLINEWID\n 40\n0.0\n  9\n$SPLFRAME\n 70\n0\n  9\n$SPLINETYPE\n 70\n6\n  9\n$SPLINESEGS\n 70\n8\n  9\n$HANDSEED\n  5\n%%HANDSEED%%\n  9\n$SURFTAB1\n 70\n6\n  9\n$SURFTAB2\n 70\n6\n  9\n$SURFTYPE\n 70\n6\n  9\n$SURFU\n 70\n6\n  9\n$SURFV\n 70\n6\n  9\n$UCSBASE\n  2\n\n  9\n$UCSNAME\n  2\n\n  9\n$UCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$UCSORTHOREF\n  2\n\n  9\n$UCSORTHOVIEW\n 70\n0\n  9\n$UCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSBASE\n  2\n\n  9\n$PUCSNAME\n  2\n\n  9\n$PUCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$PUCSORTHOREF\n  2\n\n  9\n$PUCSORTHOVIEW\n 70\n0\n  9\n$PUCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$USERI1\n 70\n0\n  9\n$USERI2\n 70\n0\n  9\n$USERI3\n 70\n0\n  9\n$USERI4\n 70\n0\n  9\n$USERI5\n 70\n0\n  9\n$USERR1\n 40\n0.0\n  9\n$USERR2\n 40\n0.0\n  9\n$USERR3\n 40\n0.0\n  9\n$USERR4\n 40\n0.0\n  9\n$USERR5\n 40\n0.0\n  9\n$WORLDVIEW\n 70\n1\n  9\n$SHADEDGE\n 70\n3\n  9\n$SHADEDIF\n 70\n70\n  9\n$TILEMODE\n 70\n1\n  9\n$MAXACTVP\n 70\n64\n  9\n$PINSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PLIMCHECK\n 70\n0\n  9\n$PEXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$PEXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$PLIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$PLIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$UNITMODE\n 70\n0\n  9\n$VISRETAIN\n 70\n1\n  9\n$PLINEGEN\n 70\n0\n  9\n$PSLTSCALE\n 70\n1\n  9\n$TREEDEPTH\n 70\n3020\n  9\n$CMLSTYLE\n  2\nStandard\n  9\n$CMLJUST\n 70\n0\n  9\n$CMLSCALE\n 40\n20.0\n  9\n$PROXYGRAPHICS\n 70\n1\n  9\n$MEASUREMENT\n 70\n1\n  9\n$CELWEIGHT\n370\n-1\n  9\n$ENDCAPS\n280\n0\n  9\n$JOINSTYLE\n280\n0\n  9\n$LWDISPLAY\n290\n0\n  9\n$INSUNITS\n 70\n6\n  9\n$HYPERLINKBASE\n  1\n\n  9\n$STYLESHEET\n  1\n\n  9\n$XEDIT\n290\n1\n  9\n$CEPSNTYPE\n380\n0\n  9\n$PSTYLEMODE\n290\n1\n  9\n$FINGERPRINTGUID\n  2\n{BFC564E0-C5DF-4936-AC56-0EABCA652FA1}\n  9\n$VERSIONGUID\n  2\n{E4BDE1FC-9771-479C-8D7E-962AC5CCAF31}\n  9\n$EXTNAMES\n290\n1\n  9\n$PSVPSCALE\n 40\n0.0\n  9\n$OLESTARTUP\n290\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nCLASSES\n  0\nCLASS\n  1\nACDBDICTIONARYWDFLT\n  2\nAcDbDictionaryWithDefault\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nSUN\n  2\nAcDbSun\n  3\nSCENEOE\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nVISUALSTYLE\n  2\nAcDbVisualStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMATERIAL\n  2\nAcDbMaterial\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nSCALE\n  2\nAcDbScale\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nTABLESTYLE\n  2\nAcDbTableStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMLEADERSTYLE\n  2\nAcDbMLeaderStyle\n  3\nACDB_MLEADERSTYLE_CLASS\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nDICTIONARYVAR\n  2\nAcDbDictionaryVar\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nCELLSTYLEMAP\n  2\nAcDbCellStyleMap\n  3\nObjectDBX Classes\n 90\n1152\n280\n0\n281\n0\n  0\nCLASS\n  1\nMENTALRAYRENDERSETTINGS\n  2\nAcDbMentalRayRenderSettings\n  3\nSCENEOE\n 90\n1024\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBDETAILVIEWSTYLE\n  2\nAcDbDetailViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBSECTIONVIEWSTYLE\n  2\nAcDbSectionViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nRASTERVARIABLES\n  2\nAcDbRasterVariables\n  3\nISM\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBPLACEHOLDER\n  2\nAcDbPlaceHolder\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nLAYOUT\n  2\nAcDbLayout\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nIMAGE\n  2\nAcDbRasterImage\n  3\nISM\n 90\n2175\n280\n0\n281\n1\n  0\nCLASS\n  1\nIMAGEDEF\n  2\nAcDbRasterImageDef\n  3\nISM\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nIMAGEDEF_REACTOR\n  2\nAcDbRasterImageDefReactor\n  3\nISM\n 90\n1\n280\n0\n281\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nVPORT\n  5\n8\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nVPORT\n  5\n23\n330\n8\n100\nAcDbSymbolTableRecord\n100\nAcDbViewportTableRecord\n  2\n*Active\n 70\n0\n 10\n0.0\n 20\n0.0\n 11\n1.0\n 21\n1.0\n 12\n0.0\n 22\n0.0\n 13\n0.0\n 23\n0.0\n 14\n0.5\n 24\n0.5\n 15\n0.5\n 25\n0.5\n 16\n0.0\n 26\n0.0\n 36\n1.0\n 17\n0.0\n 27\n0.0\n 37\n0.0\n 40\n1000.0\n 41\n1.34\n 42\n50.0\n 43\n0.0\n 44\n0.0\n 50\n0.0\n 51\n0.0\n 71\n0\n 72\n1000\n 73\n1\n 74\n3\n 75\n0\n 76\n0\n 77\n0\n 78\n0\n281\n0\n 65\n0\n146\n0.0\n  0\nENDTAB\n  0\nTABLE\n  2\nLTYPE\n  5\n2\n330\n0\n100\nAcDbSymbolTable\n 70\n3\n  0\nLTYPE\n  5\n24\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByBlock\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n25\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByLayer\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n26\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nContinuous\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nENDTAB\n  0\nTABLE\n  2\nLAYER\n  5\n1\n330\n0\n100\nAcDbSymbolTable\n 70\n15\n  0\nLAYER\n  5\n27\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n0\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n28\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDefpoints\n 70\n0\n 62\n7\n  6\nContinuous\n290\n0\n370\n-3\n390\n13\n  0\nLAYER\n  5\n2F\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPST_KAEK\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n30\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPST_KAEK_OMORA\n 70\n0\n 62\n8\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n31\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKAEK_KEIMENO\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n32\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nRYMOTOMIKI\n 70\n0\n 62\n3\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n33\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nOIKODOMIKI\n 70\n0\n 62\n5\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n34\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPOL_GRAMMES\n 70\n0\n 62\n6\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n35\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nOT\n 70\n0\n 62\n2\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n36\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nOT_ARITHMOS\n 70\n0\n 62\n2\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n37\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nORIO_OIKISMOU\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n38\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKOINOXRISTA\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n39\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPLAISIO\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3A\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nYPOVATHRO_DIAGRAMMA\n 70\n0\n 62\n9\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3B\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nYPOVATHRO_EPSX\n 70\n0\n 62\n9\n  6\nContinuous\n370\n-3\n390\n13\n  0\nENDTAB\n  0\nTABLE\n  2\nSTYLE\n  5\n5\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nSTYLE\n  5\n29\n330\n5\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n  2\nStandard\n 70\n0\n 40\n0.0\n 41\n1.0\n 50\n0.0\n 71\n0\n 42\n2.5\n  3\ntxt\n  4\n\n  0\nENDTAB\n  0\nTABLE\n  2\nVIEW\n  5\n7\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nUCS\n  5\n6\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nAPPID\n  5\n3\n330\n0\n100\nAcDbSymbolTable\n 70\n3\n  0\nAPPID\n  5\n2A\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nACAD\n 70\n0\n  0\nAPPID\n  5\n41\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nHATCHBACKGROUNDCOLOR\n 70\n0\n  0\nAPPID\n  5\n42\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nEZDXF\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nDIMSTYLE\n  5\n4\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n100\nAcDbDimStyleTable\n  0\nDIMSTYLE\n105\n2B\n330\n4\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n  2\nStandard\n 70\n0\n  3\n\n  4\n\n 40\n1.0\n 41\n2.5\n 42\n0.625\n 43\n3.75\n 44\n1.25\n 45\n0.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n140\n2.5\n141\n2.5\n142\n0.0\n143\n0.03937007874\n144\n1.0\n145\n0.0\n146\n1.0\n147\n0.625\n148\n0.0\n 71\n0\n 72\n0\n 73\n0\n 74\n0\n 75\n0\n 76\n0\n 77\n1\n 78\n8\n 79\n3\n170\n0\n171\n3\n172\n1\n173\n0\n174\n0\n175\n0\n176\n0\n177\n0\n178\n0\n179\n2\n271\n2\n272\n2\n273\n2\n274\n3\n275\n0\n276\n0\n277\n2\n278\n44\n279\n0\n280\n0\n281\n0\n282\n0\n283\n0\n284\n8\n285\n0\n286\n0\n288\n0\n289\n3\n371\n-2\n372\n-2\n  0\nENDTAB\n  0\nTABLE\n  2\nBLOCK_RECORD\n  5\n9\n330\n0\n100\nAcDbSymbolTable\n 70\n2\n  0\nBLOCK_RECORD\n  5\n17\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Model_Space\n340\n1A\n  0\nBLOCK_RECORD\n  5\n1B\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Paper_Space\n340\n1E\n  0\nENDTAB\n  0\nENDSEC\n  0\nSECTION\n  2\nBLOCKS\n  0\nBLOCK\n  5\n18\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Model_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Model_Space\n  1\n\n  0\nENDBLK\n  5\n19\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nBLOCK\n  5\n1C\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Paper_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Paper_Space\n  1\n\n  0\nENDBLK\n  5\n1D\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n%%ENTITIES%%  0\nENDSEC\n  0\nSECTION\n  2\nOBJECTS\n  0\nDICTIONARY\n  5\nA\n330\n0\n100\nAcDbDictionary\n281\n1\n  3\nACAD_COLOR\n350\nB\n  3\nACAD_GROUP\n350\nC\n  3\nACAD_LAYOUT\n350\nD\n  3\nACAD_MATERIAL\n350\nE\n  3\nACAD_MLEADERSTYLE\n350\nF\n  3\nACAD_MLINESTYLE\n350\n10\n  3\nACAD_PLOTSETTINGS\n350\n11\n  3\nACAD_PLOTSTYLENAME\n350\n12\n  3\nACAD_SCALELIST\n350\n14\n  3\nACAD_TABLESTYLE\n350\n15\n  3\nACAD_VISUALSTYLE\n350\n16\n  3\nEZDXF_META\n350\n2D\n  3\nACAD_IMAGE_VARS\n350\n3C\n  3\nACAD_IMAGE_DICT\n350\n3D\n  0\nDICTIONARY\n  5\nB\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nC\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nD\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nModel\n350\n1A\n  3\nLayout1\n350\n1E\n  0\nDICTIONARY\n  5\nE\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nByBlock\n350\n1F\n  3\nByLayer\n350\n20\n  3\nGlobal\n350\n21\n  0\nDICTIONARY\n  5\nF\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n2C\n  0\nDICTIONARY\n  5\n10\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n22\n  0\nDICTIONARY\n  5\n11\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nACDBDICTIONARYWDFLT\n  5\n12\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nNormal\n350\n13\n100\nAcDbDictionaryWithDefault\n340\n13\n  0\nACDBPLACEHOLDER\n  5\n13\n330\n12\n  0\nDICTIONARY\n  5\n14\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n15\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n16\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nLAYOUT\n  5\n1A\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n1024\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nModel\n 70\n1\n 71\n0\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n17\n  0\nLAYOUT\n  5\n1E\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n0\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nLayout1\n 70\n1\n 71\n1\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n1B\n  0\nMATERIAL\n  5\n1F\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByBlock\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n20\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByLayer\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n21\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nGlobal\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMLINESTYLE\n  5\n22\n102\n{ACAD_REACTORS\n330\n10\n102\n}\n330\n10\n100\nAcDbMlineStyle\n  2\nStandard\n 70\n0\n  3\n\n 62\n256\n 51\n90.0\n 52\n90.0\n 71\n2\n 49\n0.5\n 62\n256\n  6\nBYLAYER\n 49\n-0.5\n 62\n256\n  6\nBYLAYER\n  0\nMLEADERSTYLE\n  5\n2C\n102\n{ACAD_REACTORS\n330\nF\n102\n}\n330\nF\n100\nAcDbMLeaderStyle\n179\n2\n170\n2\n171\n1\n172\n0\n 90\n2\n 40\n0.0\n 41\n0.0\n173\n1\n 91\n-1056964608\n 92\n-2\n290\n1\n 42\n2.0\n291\n1\n 43\n8.0\n  3\nStandard\n 44\n4.0\n300\n\n342\n29\n174\n1\n175\n1\n176\n0\n178\n1\n 93\n-1056964608\n 45\n4.0\n292\n0\n297\n0\n 46\n4.0\n 94\n-1056964608\n 47\n1.0\n 49\n1.0\n140\n1.0\n294\n1\n141\n0.0\n177\n0\n142\n1.0\n295\n0\n296\n0\n143\n3.75\n271\n0\n272\n9\n273\n9\n  0\nDICTIONARY\n  5\n2D\n330\nA\n100\nAcDbDictionary\n280\n1\n281\n1\n  3\nCREATED_BY_EZDXF\n350\n2E\n  3\nWRITTEN_BY_EZDXF\n350\n43\n  0\nDICTIONARYVAR\n  5\n2E\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-11-03T13:08:27.241178+00:00\n  0\nRASTERVARIABLES\n  5\n3C\n102\n{ACAD_REACTORS\n330\nA\n102\n}\n330\nA\n100\nAcDbRasterVariables\n 90\n0\n 70\n0\n 71\n1\n 72\n3\n  0\nDICTIONARY\n  5\n3D\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\n%%F1%%\n350\n3E\n  0\nIMAGEDEF\n  5\n3E\n102\n{ACAD_REACTORS\n330\n3D\n330\n40\n102\n}\n330\n3D\n100\nAcDbRasterImageDef\n 90\n0\n  1\n%%F1%%\n 10\n%%W1%%\n 20\n%%H1%%\n 11\n0.01\n 21\n0.01\n280\n1\n281\n0\n  0\nIMAGEDEF_REACTOR\n  5\n40\n330\n3F\n100\nAcDbRasterImageDefReactor\n 90\n2\n330\n3F\n  0\nDICTIONARYVAR\n  5\n43\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-11-03T13:08:27.243701+00:00\n  0\nENDSEC\n  0\nEOF\n", "img": "  0\nIMAGE\n  5\n3F\n330\n17\n100\nAcDbEntity\n  8\nYPOVATHRO_EPSX\n100\nAcDbRasterImage\n 90\n0\n 10\n%%X%%\n 20\n%%Y%%\n 30\n0.0\n 11\n%%PX%%\n 21\n0.0\n 31\n0.0\n 12\n0.0\n 22\n%%PY%%\n 32\n0.0\n 13\n%%W%%\n 23\n%%H%%\n340\n3E\n 70\n3\n280\n0\n281\n50\n282\n50\n283\n0\n360\n40\n 71\n1\n 91\n2\n%%CLIP0%%%%CLIP1%%", "seed": "44"};
const UDM = "https://sdigmap.tee.gov.gr/mapping/rest/services/UDM/";
const PLIR = UDM + "UDM_SERVICE_POLEODOMIKI_PLIROFORIA/MapServer/";
const DOCS = UDM + "UDM_SERVICE_SXEDIA_DOCS/MapServer/0/query";
const FN_URL = "https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/oroi-domisis";
const LIBS = {
  geotiff: "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js",
  pdfmake: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js",
  vfs:     "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js",
  jszip:   "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
};
const SCALES = [100, 200, 500, 1000];
const PRJ = 'PROJCS["GGRS_1987_Greek_Grid",GEOGCS["GCS_GGRS_1987",DATUM["D_GGRS_1987",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",24.0],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0]]';
const PAPER = { A4:{w:297, h:210, label:"A4 οριζόντιο"}, A3:{w:420, h:297, label:"A3 οριζόντιο"} };
const MARGIN = 10, TITLE_H = 34, DPI = 200;
const esc = s => (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = (n,d=2)=> (n==null||!isFinite(n)) ? "—" : Number(n).toLocaleString("el-GR",{minimumFractionDigits:d,maximumFractionDigits:d});

function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("Δεν φορτώθηκε: "+src)); document.head.appendChild(s); }); }
async function need(names){
  for(const n of names){
    if(n==="geotiff" && typeof GeoTIFF==="undefined") await loadScript(LIBS.geotiff);
    if(n==="pdf" && typeof pdfMake==="undefined"){ await loadScript(LIBS.pdfmake); await loadScript(LIBS.vfs); }
    if(n==="zip" && typeof JSZip==="undefined") await loadScript(LIBS.jszip);
  }
}
function token(){ try{ const s=JSON.parse(localStorage.getItem("sb-oucqqudfdimccgowvpqp-auth-token")||"null"); return (s && (s.access_token || (s.currentSession&&s.currentSession.access_token))) || ""; }catch(e){ return ""; } }

/* ---------- γεωμετρία ---------- */
const H = () => window.HXOroi;              // βοηθητικά από το oroi-domisis.js
function bboxOf(rings){ const b=[Infinity,Infinity,-Infinity,-Infinity]; rings.forEach(r=>r.forEach(([x,y])=>{ b[0]=Math.min(b[0],x); b[1]=Math.min(b[1],y); b[2]=Math.max(b[2],x); b[3]=Math.max(b[3],y); })); return b; }
function frameMm(paper){ const P=PAPER[paper]; return {w:P.w-2*MARGIN, h:P.h-2*MARGIN-TITLE_H}; }
/* Το απόσπασμα περιλαμβάνει ολόκληρο το Ο.Τ. του γεωτεμαχίου (όταν υπάρχει) */
function extentFor(parcel, scale, paper, ot){
  const rings = H().polysOf(parcel.geometry_egsa).flat().map(H().openRing).concat(ot && ot.rings ? ot.rings : []);
  const b = bboxOf(rings), cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2;
  const f = frameMm(paper), W = f.w*scale/1000, Hh = f.h*scale/1000;
  const fits = (b[2]-b[0]) <= W*0.92 && (b[3]-b[1]) <= Hh*0.92;
  return {bbox:[cx-W/2, cy-Hh/2, cx+W/2, cy+Hh/2], W, H:Hh, fits, pb:b};
}
function suggestScale(parcel, paper, ot){
  for(const s of SCALES){ const e=extentFor(parcel,s,paper,ot); const pw=e.pb[2]-e.pb[0], ph=e.pb[3]-e.pb[1]; if(pw<=e.W*0.7 && ph<=e.H*0.7) return s; }
  return SCALES[SCALES.length-1];
}

/* ---------- πηγές ---------- */
async function arcQuery(url, params){
  const body = new URLSearchParams(Object.assign({f:"json", inSR:"2100", outSR:"2100", outFields:"*", spatialRel:"esriSpatialRelIntersects"}, params));
  const r = await fetch(url, {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body});
  if(!r.ok) throw new Error("ΕΨΧ HTTP "+r.status);
  const j = await r.json(); if(j.error) throw new Error("ΕΨΧ: "+(j.error.message||j.error.code));
  return j.features || [];
}
async function listDiagrams(x, y){
  const fs = await arcQuery(DOCS, {geometry:x+","+y, geometryType:"esriGeometryPoint", returnGeometry:"false"});
  const seen = new Set(), out = [];
  fs.forEach(f=>{ const a=f.attributes||{}; const u=a.GEOREF_DIAGRAM_URL; if(!u || seen.has(u)) return; seen.add(u);
    out.push({url:u, fek:a.FEK, title:a.TITLE, scale:+a.INIT_DIAGR_SCALE_DENOMINATOR||0, rms:a.GGRS87_DIAGR_GEOREF_RMS, date:a.PUBL_DATE||"", fekUrl:a.FEK_FILE_URL}); });
  const dnum = d=> { const m=String(d||"").match(/(\d{4})/); return m?+m[1]:0; };
  out.sort((a,b)=> (a.scale||1e9)-(b.scale||1e9) || dnum(b.date)-dnum(a.date));
  return out;
}
/* το Ο.Τ. που περιέχει το γεωτεμάχιο (γεωμετρία ΕΓΣΑ'87) */
async function otOf(x, y){
  const fs = await arcQuery(PLIR+"6/query", {geometry:x+","+y, geometryType:"esriGeometryPoint", returnGeometry:"true", resultRecordCount:"3"});
  const f = fs.find(f=> f.geometry && f.geometry.rings && f.geometry.rings.length); if(!f) return null;
  return {num:(f.attributes||{}).OT_NUM||"", rings:f.geometry.rings.map(H().openRing)};
}
async function vectors(bb){
  const env = JSON.stringify({xmin:bb[0], ymin:bb[1], xmax:bb[2], ymax:bb[3], spatialReference:{wkid:2100}});
  const defs = [ {id:3, layer:"ORIO_OIKISMOU"}, {id:6, layer:"OT"}, {id:11, layer:"RYMOTOMIKI"}, {id:12, layer:"OIKODOMIKI"}, {id:13, layer:"POL_GRAMMES"}, {id:22, layer:"KOINOXRISTA"} ];
  const res = await Promise.all(defs.map(d=> arcQuery(PLIR+d.id+"/query", {geometry:env, geometryType:"esriGeometryEnvelope", returnGeometry:"true", resultRecordCount:"2000"}).catch(()=>[])));
  const out = [];
  defs.forEach((d,i)=> res[i].forEach(f=>{
    const g=f.geometry||{}, a=f.attributes||{};
    (g.rings||[]).forEach(r=> out.push({layer:d.layer, pts:H().openRing(r), closed:true, a}));
    (g.paths||[]).forEach(p=> out.push({layer:d.layer, pts:p.map(q=>[q[0],q[1]]), closed:false, a}));
    if(d.id===6 && a.OT_NUM && g.rings && g.rings.length){ const po={outer:H().openRing(g.rings[0]), holes:[]}; out.push({layer:"OT_ARITHMOS", text:"Ο.Τ. "+a.OT_NUM, at:H().interiorPoint(po)}); }
  }));
  return out;
}

/* ---------- πράξεις (ΦΕΚ) που εμφανίζονται στην περιοχή του αποσπάσματος ---------- */
const ACT_LAYERS = [[11,"ρυμοτομική"],[12,"οικοδομική"],[6,"Ο.Τ."],[13,"λοιπές γραμμές"],[22,"κοινόχρηστα"],[3,"όριο οικισμού"]];
async function actsIn(bb){
  const env = JSON.stringify({xmin:bb[0], ymin:bb[1], xmax:bb[2], ymax:bb[3], spatialReference:{wkid:2100}});
  const p = {geometry:env, geometryType:"esriGeometryEnvelope", returnGeometry:"false", resultRecordCount:"500",
    outFields:"FEK,FEK_FILE_URL,TITLE,PUBL_DATE,APOF_EIDOS,GEOREF_DIAGRAM_URL,INITIAL_DIAGRAM_URL"};
  const res = await Promise.all(ACT_LAYERS.map(([id])=> arcQuery(PLIR+id+"/query", p).catch(()=>[])));
  const docs = await arcQuery(DOCS, Object.assign({}, p, {outFields:"*"})).catch(()=>[]);
  const by = new Map();
  const add = (a, what)=>{
    const k = a.FEK || a.FEK_FILE_URL; if(!k) return;
    const r = by.get(k) || {fek:a.FEK||"", title:a.TITLE||"", date:a.PUBL_DATE||"", eidos:a.APOF_EIDOS||"", fekUrl:a.FEK_FILE_URL||"", diags:new Map(), what:new Set()};
    if(what) r.what.add(what);
    if(a.GEOREF_DIAGRAM_URL && !r.diags.has(a.GEOREF_DIAGRAM_URL)) r.diags.set(a.GEOREF_DIAGRAM_URL, {url:a.GEOREF_DIAGRAM_URL, raw:a.INITIAL_DIAGRAM_URL||"", scale:+a.INIT_DIAGR_SCALE_DENOMINATOR||0, rms:a.GGRS87_DIAGR_GEOREF_RMS, n:a.COMP_DIAGR_LEGEND_NUMBER||""});
    else if(a.GEOREF_DIAGRAM_URL){ const d=r.diags.get(a.GEOREF_DIAGRAM_URL); if(!d.scale && a.INIT_DIAGR_SCALE_DENOMINATOR){ d.scale=+a.INIT_DIAGR_SCALE_DENOMINATOR; d.rms=a.GGRS87_DIAGR_GEOREF_RMS; } }
    by.set(k, r);
  };
  ACT_LAYERS.forEach(([,w],i)=> res[i].forEach(f=> add(f.attributes||{}, w)));
  docs.forEach(f=> add(f.attributes||{}, null));
  const yr = d=> { const m=String(d||"").match(/(\d{4})/); return m?+m[1]:0; };
  return [...by.values()].map(r=> Object.assign(r, {diags:[...r.diags.values()], what:[...r.what]}))
    .sort((a,b)=> (b.what.length?1:0)-(a.what.length?1:0) || yr(a.date)-yr(b.date));
}
/* ολόκληρο το γεωαναφερμένο διάγραμμα μιας πράξης → ZIP για AutoCAD/GIS */
async function runActDiagram(st, d, act){
  await need(["geotiff","zip"]);
  const base = d.url.split("/").pop().replace(/\.tif$/i,"");
  const tok = token();
  setStatus(`Διάγραμμα ΦΕΚ ${esc(act.fek)}: ανάγνωση…`);
  const tiff = await GeoTIFF.fromUrl(FN_URL + "?tif=" + encodeURIComponent(d.url), {headers: tok?{Authorization:"Bearer "+tok}:{}, allowFullFile:false, blockSize:262144});
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin(), [rx, ry] = img.getResolution(), ary = Math.abs(ry);
  const iw = img.getWidth(), ih = img.getHeight();
  // για απλό AutoCAD: JPG + JGW (το πρωτότυπο TIFF του ΤΕΕ είναι JPEG-in-TIFF, που δεν το ανοίγουν όλα τα CAD)
  const f = Math.min(1, 8000/Math.max(iw, ih), Math.sqrt(36e6/(iw*ih)));
  const W = Math.max(1, Math.round(iw*f)), Hh = Math.max(1, Math.round(ih*f));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, Hh);
  const STRIP = Math.max(64, Math.floor(4e6 / W));
  for(let y0 = 0; y0 < Hh; y0 += STRIP){
    const y1 = Math.min(Hh, y0 + STRIP), sy0 = Math.floor(y0/f), sy1 = Math.min(ih, Math.ceil(y1/f));
    setStatus(`Διάγραμμα ΦΕΚ ${esc(act.fek)}: ${Math.round(100*y0/Hh)}%…`);
    const rgb = await img.readRGB({window:[0, sy0, iw, sy1], width:W, height:y1-y0, interleave:true, resampleMethod:"bilinear"});
    const spp = rgb.length / (W*(y1-y0)) >= 4 ? 4 : 3, id = ctx.createImageData(W, y1-y0);
    for(let i=0,j=0;i<W*(y1-y0);i++,j+=spp){ const r=rgb[j], g=rgb[j+1], b=rgb[j+2], e=(r+g+b)<9; id.data[i*4]=e?255:r; id.data[i*4+1]=e?255:g; id.data[i*4+2]=e?255:b; id.data[i*4+3]=255; }
    ctx.putImageData(id, 0, y0);
  }
  const jpg = await new Promise((res, rej)=> cv.toBlob(b=> b ? res(b) : rej(new Error("Το διάγραμμα είναι πολύ μεγάλο για αυτή τη συσκευή — δοκίμασε σε υπολογιστή.")), "image/jpeg", 0.9));
  cv.width = cv.height = 1;
  const pxX = rx/f, pxY = ary/f;
  const world = (sx, sy)=> [sx, 0, 0, -sy, ox + sx/2, oy - sy/2].map(v=> v.toFixed(6)).join("\r\n") + "\r\n";
  const bb = [ox, oy - Hh*pxY, ox + W*pxX, oy];
  const o = {parcel: st.parcel, scale: 1000, bbox: bb};
  const dxf = makeDxf(o, [{layer:"FEK_KEIMENO", text:"ΦΕΚ " + (act.fek||""), at:[bb[0] + 0.02*(bb[2]-bb[0]), bb[3] - 0.02*(bb[3]-bb[1])]}], {res:pxX, resY:pxY, w:W, h:Hh}, base + ".jpg")
    .replace(/\r\n  8\r\nYPOVATHRO_EPSX\r\n/, "\r\n  8\r\nYPOVATHRO_FEK\r\n");
  const zip = new JSZip();
  zip.file(base + ".jpg", jpg); zip.file(base + ".jgw", world(pxX, pxY));
  zip.file(base + ".dxf", dxf);
  zip.file(base + ".tfw", world(rx, ary));          // για το πρωτότυπο TIFF του ΤΕΕ (σύνδεσμος στις οδηγίες)
  zip.file(base + ".prj", PRJ);
  zip.file("ODIGIES.txt", [
    "HEXIS-APP · Διάγραμμα ΦΕΚ " + (act.fek||"") + " — γεωαναφερμένο (ΕΓΣΑ'87, μέτρα)",
    act.title || "", "",
    "1. Αποσυμπίεσε ΟΛΑ τα αρχεία στον ίδιο φάκελο.",
    "2. AutoCAD: άνοιξε το " + base + ".dxf (ή INSERT στο σχέδιό σου, σημείο 0,0, κλίμακα 1).",
    "   Το διάγραμμα (" + base + ".jpg) μπαίνει μόνο του στη σωστή θέση, μαζί με το PST_KAEK του γεωτεμαχίου " + st.parcel.kaek + ".",
    "3. GIS / Civil 3D / Map: το " + base + ".jpg με το " + base + ".jgw είναι γεωαναφερμένο.",
    "   Μέγεθος pixel: " + pxX.toFixed(4) + " μ." + (f < 1 ? " (σμίκρυνση " + Math.round(f*100) + "% του πρωτοτύπου, για να ανοίγει άνετα)" : ""),
    "4. Πρωτότυπο GeoTIFF του ΤΕΕ σε πλήρη ανάλυση: " + d.url,
    "   Κατέβασέ το στον ίδιο φάκελο — το " + base + ".tfw που υπάρχει εδώ το τοποθετεί σε GIS / Map 3D.",
    d.raw ? "   Αρχική σάρωση (χωρίς γεωαναφορά): " + d.raw : "",
    act.fekUrl ? "5. Κείμενο ΦΕΚ: " + act.fekUrl : "",
    "", "Ακρίβεια γεωαναφοράς (RMS): " + (d.rms!=null ? d.rms + " μ." : "—") + (d.scale ? " · αρχική κλίμακα 1:" + d.scale : ""),
    "Πηγή: Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ). Ενημερωτικό — δεν υποκαθιστά επικυρωμένο απόσπασμα της ΥΔΟΜ."
  ].filter(x=> x!=="").join("\r\n"));
  const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE"});
  download(blob, "diagramma_FEK_" + String(act.fek||base).replace(/[^0-9A-Za-zΑ-Ωα-ω]+/g, "_") + ".zip");
  setStatus(`✅ Έτοιμο: διάγραμμα ΦΕΚ ${esc(act.fek)} γεωαναφερμένο (JPG + JGW + DXF για AutoCAD).`);
  return {zip:blob, dxf, f, W, H:Hh};
}
function actsHtml(acts){
  if(!acts) return `<div class="ox-acts-h">Πράξεις (ΦΕΚ) στην περιοχή</div><div class="ox-acts-e">Φόρτωση…</div>`;
  if(!acts.length) return `<div class="ox-acts-h">Πράξεις (ΦΕΚ) στην περιοχή</div><div class="ox-acts-e">Δεν βρέθηκαν πράξεις στον Ενιαίο Ψηφιακό Χάρτη για αυτή την περιοχή.</div>`;
  return `<div class="ox-acts-h">Πράξεις (ΦΕΚ) στην περιοχή του αποσπάσματος (${acts.length})</div>` + acts.map((a,i)=>`<div class="ox-act">
    <div><b>ΦΕΚ ${esc(a.fek)}</b>${a.date?` · ${esc(a.date)}`:""}${a.what.length?` · <span class="ox-what">${esc(a.what.join(", "))}</span>`:""}<div class="ox-at">${esc((a.title||"").slice(0,140))}</div></div>
    <div class="ox-ab">${a.fekUrl?`<a class="ox-sb" href="${esc(a.fekUrl)}" target="_blank" rel="noopener">ΦΕΚ (PDF)</a>`:""}${a.diags.map((d,j)=>`<button type="button" class="ox-sb ox-dg" data-a="${i}" data-d="${j}" title="Ολόκληρο το σαρωμένο διάγραμμα, γεωαναφερμένο σε ΕΓΣΑ΄87 — JPG + JGW + DXF για AutoCAD">Διάγραμμα${a.diags.length>1?" "+(j+1):""} γεωαναφ.${d.scale?" 1:"+d.scale:""}</button>`).join("")}</div>
  </div>`).join("") + `<div class="ox-acts-n">Οι Τεχνικές Εκθέσεις και τα Διαγράμματα Εφαρμογής της ΥΔΟΜ δεν δημοσιεύονται στον Ενιαίο Ψηφιακό Χάρτη — εδώ εμφανίζονται οι πράξεις (ΦΕΚ) που έχουν ψηφιοποιηθεί.</div>`;
}

/* ---------- εικόνα υποβάθρου (καμβάς στο πλαίσιο, ΕΓΣΑ'87) ---------- */
async function drawDiagram(ctx, d, bb, pw, ph){
  await need(["geotiff"]);
  const tok = token();
  const tiff = await GeoTIFF.fromUrl(FN_URL + "?tif=" + encodeURIComponent(d.url), {headers: tok?{Authorization:"Bearer "+tok}:{}, allowFullFile:false, blockSize:131072});
  const img = await tiff.getImage();
  const [ox, oy] = img.getOrigin(), [rx, ry] = img.getResolution();      // ry < 0
  const iw = img.getWidth(), ih = img.getHeight(), ary = Math.abs(ry);
  // παράθυρο σε pixels του TIFF
  let wx0 = (bb[0]-ox)/rx, wx1 = (bb[2]-ox)/rx, wy0 = (oy-bb[3])/ary, wy1 = (oy-bb[1])/ary;
  const cx0 = Math.max(0, Math.floor(wx0)), cx1 = Math.min(iw, Math.ceil(wx1)), cy0 = Math.max(0, Math.floor(wy0)), cy1 = Math.min(ih, Math.ceil(wy1));
  if(cx1<=cx0 || cy1<=cy0) return false;
  const sx = pw/(wx1-wx0), sy = ph/(wy1-wy0);                          // pixels καμβά ανά pixel TIFF
  const tx = Math.round((cx0-wx0)*sx), ty = Math.round((cy0-wy0)*sy);
  const tw = Math.max(1, Math.round((cx1-cx0)*sx)), th = Math.max(1, Math.round((cy1-cy0)*sy));
  const rgb = await img.readRGB({window:[cx0,cy0,cx1,cy1], width:tw, height:th, interleave:true, resampleMethod:"bilinear"});
  const spp = rgb.length / (tw*th) >= 4 ? 4 : 3;              // μερικά διαγράμματα έχουν και 4ο κανάλι
  // το μαύρο περιθώριο γύρω από το στραμμένο σαρωμένο φύλλο (τιμή 0) είναι «χωρίς δεδομένα» → λευκό
  const id = ctx.createImageData(tw, th); let nod = 0;
  for(let i=0,j=0;i<tw*th;i++,j+=spp){
    const r=rgb[j], g=rgb[j+1], b=rgb[j+2], empty = (r+g+b) < 9 || (spp===4 && rgb[j+3]===0);
    if(empty) nod++;
    id.data[i*4]=empty?255:r; id.data[i*4+1]=empty?255:g; id.data[i*4+2]=empty?255:b; id.data[i*4+3]=255;
  }
  // μετρά μόνο το κομμάτι γύρω από το κέντρο (εκεί είναι το γεωτεμάχιο)
  const cxp = Math.round(pw/2 - tx), cyp = Math.round(ph/2 - ty); let cn = 0, ce = 0;
  for(let yy=Math.max(0,cyp-40); yy<Math.min(th,cyp+40); yy+=4) for(let xx=Math.max(0,cxp-40); xx<Math.min(tw,cxp+40); xx+=4){ ce++; const q=(yy*tw+xx)*4; if(id.data[q]===255&&id.data[q+1]===255&&id.data[q+2]===255 && (rgb[(yy*tw+xx)*spp]+rgb[(yy*tw+xx)*spp+1]+rgb[(yy*tw+xx)*spp+2])<9) cn++; }
  const centreEmpty = ce ? cn/ce : 1;
  if(centreEmpty > 0.6) return {ok:false, why:"empty"};       // το φύλλο δεν καλύπτει το γεωτεμάχιο
  ctx.putImageData(id, tx, ty);
  return {ok:true, nodata: nod/(tw*th)};
}
async function drawEpsx(ctx, bb, pw, ph){
  const q = new URLSearchParams({bbox:bb.join(","), bboxSR:"2100", imageSR:"2100", size:pw+","+ph, format:"png32", transparent:"true",
    layers:"show:3,4,6,7,11,12,13,22,24", dpi:String(DPI), f:"image"});
  const r = await fetch(PLIR + "export?" + q.toString());
  if(!r.ok) throw new Error("ΕΨΧ εικόνα HTTP "+r.status);
  const bmp = await createImageBitmap(await r.blob());
  ctx.drawImage(bmp, 0, 0, pw, ph);
}
async function baseCanvas(opt){
  const f = frameMm(opt.paper), pw = Math.round(f.w/25.4*DPI), ph = Math.round(f.h/25.4*DPI);
  const c = document.createElement("canvas"); c.width=pw; c.height=ph;
  const ctx = c.getContext("2d"); ctx.fillStyle="#fff"; ctx.fillRect(0,0,pw,ph);
  const notes = [];
  if(opt.diagram){
    // αν το επιλεγμένο διάγραμμα δεν καλύπτει το σημείο, δοκιμάζουμε τα επόμενα (λεπτομερέστερα πρώτα)
    const cands = [opt.diagram].concat((opt.diags||[]).filter(d=> d!==opt.diagram && d.scale && d.scale<=10000));
    let used = null;
    for(const d of cands.slice(0,4)){
      try{
        const r = await drawDiagram(ctx, d, opt.bbox, pw, ph);
        if(r && r.ok){ used = d; break; }
        if(d===opt.diagram) notes.push(`Το διάγραμμα ΦΕΚ ${d.fek||""} δεν καλύπτει στην πράξη το γεωτεμάχιο (το σαρωμένο φύλλο σταματά πριν).`);
      }catch(e){ console.warn(e); if(d===opt.diagram) notes.push("Το σαρωμένο διάγραμμα δεν φορτώθηκε ("+(e.message||e)+")."); }
    }
    if(used && used!==opt.diagram) notes.push(`Χρησιμοποιήθηκε το διάγραμμα ΦΕΚ ${used.fek||""} (1:${used.scale||"—"}).`);
    if(!used) notes.push("Κανένα σαρωμένο διάγραμμα δεν καλύπτει το γεωτεμάχιο — το απόσπασμα έχει μόνο τις ψηφιοποιημένες γραμμές.");
    opt.diagramUsed = used;
  }
  if(opt.epsx){ try{ await drawEpsx(ctx, opt.bbox, pw, ph); }catch(e){ console.warn(e); notes.push("Οι ψηφιοποιημένες γραμμές του ΕΨΧ δεν φορτώθηκαν."); } }
  return {canvas:c, pw, ph, notes};
}
/* σχεδίαση ΚΑΕΚ, βορρά, κλίμακας, συντεταγμένων (μόνο για το PDF) */
function decorate(base, opt){
  const c = document.createElement("canvas"); c.width=base.pw; c.height=base.ph;
  const ctx = c.getContext("2d"); ctx.drawImage(base.canvas,0,0);
  const bb = opt.bbox, k = base.pw/(bb[2]-bb[0]);
  const P = ([x,y])=> [(x-bb[0])*k, (bb[3]-y)*k];
  const ring = (r)=>{ ctx.beginPath(); r.forEach((p,i)=>{ const [u,v]=P(p); i?ctx.lineTo(u,v):ctx.moveTo(u,v); }); ctx.closePath(); };
  const mm = v => v/25.4*DPI;
  (opt.parcel.neighbors||[]).forEach(n=>{ H().polysOf(n.geometry_egsa).forEach(p=>{ ring(H().openRing(p[0])); ctx.strokeStyle="rgba(90,90,90,.75)"; ctx.lineWidth=mm(0.18); ctx.setLineDash([mm(1.2),mm(0.8)]); ctx.stroke(); ctx.setLineDash([]); }); });
  if(opt.ot) opt.ot.rings.forEach(r=>{ ring(r); ctx.strokeStyle="rgba(31,78,156,.95)"; ctx.lineWidth=mm(0.45); ctx.setLineDash([mm(2.5),mm(1)]); ctx.stroke(); ctx.setLineDash([]); });
  H().polysOf(opt.parcel.geometry_egsa).forEach(p=> p.forEach(r=>{ ring(H().openRing(r)); ctx.strokeStyle="#D7001C"; ctx.lineWidth=mm(0.6); ctx.stroke(); }));
  // ΚΑΕΚ στο εσωτερικό σημείο
  const ip = H().interiorPoint(H().mainOuter(opt.parcel.geometry_egsa)), [u,v] = P(ip);
  ctx.font = `700 ${mm(2.6)}px Inter, Arial, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.lineWidth = mm(0.9); ctx.strokeStyle="rgba(255,255,255,.95)"; ctx.strokeText(opt.parcel.kaek, u, v); ctx.fillStyle="#D7001C"; ctx.fillText(opt.parcel.kaek, u, v);
  // κάνναβος ΕΓΣΑ'87: σταυροί
  const step = opt.scale<=200 ? 10 : opt.scale<=500 ? 25 : 50;
  ctx.strokeStyle="rgba(20,33,61,.55)"; ctx.lineWidth=mm(0.15); ctx.font=`${mm(1.8)}px Inter, Arial, sans-serif`; ctx.fillStyle="#14213D";
  for(let x=Math.ceil(bb[0]/step)*step; x<bb[2]; x+=step) for(let y=Math.ceil(bb[1]/step)*step; y<bb[3]; y+=step){
    const [a,b]=P([x,y]); ctx.beginPath(); ctx.moveTo(a-mm(1.5),b); ctx.lineTo(a+mm(1.5),b); ctx.moveTo(a,b-mm(1.5)); ctx.lineTo(a,b+mm(1.5)); ctx.stroke(); }
  ctx.textAlign="left"; ctx.textBaseline="top";
  for(let x=Math.ceil(bb[0]/step)*step; x<bb[2]; x+=step){ const [a]=P([x,bb[3]]); ctx.fillText(String(x), a+mm(0.6), mm(0.6)); }
  ctx.textAlign="left"; ctx.textBaseline="bottom";
  for(let y=Math.ceil(bb[1]/step)*step; y<bb[3]; y+=step){ const [,b]=P([bb[0],y]); ctx.fillText(String(y), mm(0.8), b-mm(0.5)); }
  // βορράς (κάνναβος ΕΓΣΑ'87)
  const nx = base.pw - mm(12), ny = mm(10);
  ctx.fillStyle="#14213D"; ctx.beginPath(); ctx.moveTo(nx, ny-mm(5)); ctx.lineTo(nx+mm(2.4), ny+mm(3)); ctx.lineTo(nx, ny+mm(1.6)); ctx.lineTo(nx-mm(2.4), ny+mm(3)); ctx.closePath(); ctx.fill();
  ctx.font=`700 ${mm(3)}px Inter, Arial, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="top"; ctx.fillText("Β", nx, ny+mm(3.6));
  // γραφική κλίμακα
  const seg = opt.scale<=100 ? 2 : opt.scale<=200 ? 5 : opt.scale<=500 ? 10 : 20, L = seg*k;
  const sx0 = mm(6), sy0 = base.ph - mm(8);
  ctx.fillStyle="rgba(255,255,255,.9)"; ctx.fillRect(sx0-mm(2), sy0-mm(5), 4*L+mm(14), mm(9));
  for(let i=0;i<4;i++){ ctx.fillStyle = i%2 ? "#fff" : "#14213D"; ctx.fillRect(sx0+i*L, sy0, L, mm(1.4)); ctx.strokeStyle="#14213D"; ctx.lineWidth=mm(0.2); ctx.strokeRect(sx0+i*L, sy0, L, mm(1.4)); }
  ctx.fillStyle="#14213D"; ctx.font=`${mm(2)}px Inter, Arial, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="bottom";
  for(let i=0;i<=4;i++) ctx.fillText(String(i*seg), sx0+i*L, sy0-mm(0.6));
  ctx.textAlign="left"; ctx.fillText("μ.", sx0+4*L+mm(2), sy0+mm(1.6));
  // πλαίσιο
  ctx.strokeStyle="#14213D"; ctx.lineWidth=mm(0.35); ctx.strokeRect(0,0,base.pw,base.ph);
  return c;
}

/* ---------- PDF ---------- */
const LAB = {sd:"Συντελεστής δόμησης", kalypsi:"Κάλυψη", ypsos:"Ύψος / όροφοι", artiotita:"Αρτιότητα", systima:"Οικοδομικό σύστημα",
  oikismos:"Όριο οικισμού", ot:"Οικοδομικό τετράγωνο", sxedio:"Εγκεκριμένο σχέδιο / πράξεις", ektos:"Περιοχή εκτός σχεδίου",
  enotita:"Πολεοδομική ενότητα", xriseis_gps:"Χρήσεις γης ΓΠΣ", xriseis_ers:"Χρήσεις γης ΕΡΣ", koinox:"Κοινόχρηστοι / κοινωφελείς χώροι",
  archaiol:"Αρχαιολογική ζώνη", apallotr:"Ζώνη απαλλοτρίωσης", zoe:"Ζώνη Οικιστικού Ελέγχου (ΖΟΕ)", pd_prost:"Ζώνη ΠΔ προστασίας", rema:"Ρέμα ιδιαίτερου ενδιαφέροντος", fek_nodiag:"ΦΕΚ χωρίς διάγραμμα"};
const ORDER = ["sxedio","oikismos","ot","ektos","enotita","sd","kalypsi","ypsos","artiotita","systima","xriseis_gps","xriseis_ers","koinox","zoe","pd_prost","archaiol","apallotr","rema","fek_nodiag"];
const FLAB = {SD_TIMH:"ΣΔ", SD_KLIMAKOTOS:"Κλιμακωτός", SD_TOMEAS:"Τομέας", SD_COMMENT:"Σχόλιο", SYNT_KALYPSIS:"Κάλυψη %", MAX_HEIGHT_M:"Μέγιστο ύψος (μ.)", MAX_OROFOI:"Μέγιστοι όροφοι",
  OROR_MAX_HEIGHT_COMMENT:"Σχόλιο ύψους", ELAX_EMBADO_M2:"Ελάχιστο εμβαδόν (τ.μ.)", ELAX_PROSOP_M:"Ελάχιστο πρόσωπο (μ.)", OROS_TYPE:"Είδος", DATE_PAREKLISIS:"Ημ/νία παρέκκλισης",
  SYNTHIKI_TXT:"Συνθήκη", REMARKS:"Παρατηρήσεις", OIK_SYSTHMA:"Οικοδομικό σύστημα", OROIKS_COMMENT:"Σχόλιο", NAME:"Όνομα", OT_NUM:"Αρ. Ο.Τ.", KALL_DHM_NAME:"Δήμος",
  GEN_XRHSH_GPS:"Γενική χρήση", GEN_XRHSH:"Γενική χρήση", EID_XRHSH_TXT:"Ειδική χρήση", APOF_THEME:"Θέμα πράξης", APOF_EIDOS:"Είδος πράξης", TITLE:"Τίτλος", NUMBER_:"Αριθμός", SIGN_DATE:"Υπογραφή", FEK:"ΦΕΚ", PUBL_DATE:"Δημοσίευση"};
const SKIP = /^(OBJECTID|FEK_FILE_URL|GEOREF_DIAGRAM_URL|INITIAL_DIAGRAM_URL|EIDIKH_CODED_DELIM_VALUES|GEN_XRHSH_FLAG|KEY_.*|RN|SHAPE\..*)$/;
function attrRows(a){
  const rows=[];
  Object.keys(a).forEach(k=>{ if(SKIP.test(k)) return; const v=a[k]; if(v==null||v==="") return;
    rows.push([{text:FLAB[k]||k, style:"lab"}, {text:pdfText(typeof v==="number" ? fmt(v, Number.isInteger(v)?0:2) : v), style:"val"}]); });
  if(a.FEK_FILE_URL) rows.push([{text:"Κείμενο ΦΕΚ", style:"lab"}, {text:a.FEK_FILE_URL, link:a.FEK_FILE_URL, style:"link"}]);
  return rows;
}
/* η γραμματοσειρά του PDF δεν έχει βέλη/emoji — αντικατάσταση με απλούς χαρακτήρες */
function pdfText(t){ return String(t==null?"":t).replace(/→/g,"»").replace(/✅/g,"ΝΑΙ").replace(/❌/g,"ΟΧΙ").replace(/⚠️?/g,"Προσοχή:").replace(/ℹ️?/g,"")
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{23F3}]/gu,"").replace(/\s{2,}/g," ").trim(); }
async function makePdf(opt, mapCanvas, summary){
  await need(["pdf"]);
  const P = PAPER[opt.paper], f = frameMm(opt.paper), pt = 72/25.4;
  const img = mapCanvas.toDataURL("image/jpeg", 0.9);
  const today = new Date().toLocaleDateString("el-GR");
  const d = opt.diagramUsed !== undefined ? opt.diagramUsed : opt.diagram;
  const content = [
    {image:img, width:f.w*pt, height:f.h*pt},
    {margin:[0,4,0,0], table:{widths:["*", 150, 120], body:[[
      {stack:[{text:opt.kind, style:"tt"},
              {text:`ΚΑΕΚ ${opt.parcel.kaek} · εμβαδόν ${fmt(opt.parcel.area_m2)} τ.μ.${opt.ot&&opt.ot.num?" · Ο.Τ. "+opt.ot.num:""} · ${summary.status||""}`, style:"t2"},
              {text: d ? `Υπόβαθρο: διάγραμμα ΦΕΚ ${d.fek||""} (αρχική κλίμακα 1:${d.scale||"—"}, RMS γεωαναφοράς ${d.rms!=null?fmt(d.rms,2)+" μ.":"—"})` : "Υπόβαθρο: ψηφιοποιημένα στοιχεία Ενιαίου Ψηφιακού Χάρτη", style:"t3"},
              {text:"Πηγές: Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ) · Ελληνικό Κτηματολόγιο · Σύστημα ΕΓΣΑ΄87", style:"t3"}]},
      {stack:[{text:"ΚΛΙΜΑΚΑ", style:"t3"}, {text:"1:"+opt.scale, style:"sc"}, {text:"Εκτύπωση σε 100% (χωρίς «προσαρμογή»)", style:"t3"}]},
      {stack:[{text:"HEXIS-APP", style:"br"}, {text:"hexis-app.gr", style:"t3"}, {text:today, style:"t3"}]}
    ]]}, layout:{hLineColor:"#14213D", vLineColor:"#14213D", hLineWidth:()=>0.6, vLineWidth:()=>0.6, paddingLeft:()=>5, paddingRight:()=>5, paddingTop:()=>3, paddingBottom:()=>3}}
  ];
  // σελίδα 2+: όροι αναλυτικά
  content.push({text:"ΟΡΟΙ ΔΟΜΗΣΗΣ — ΑΝΑΛΥΤΙΚΑ", style:"h1", pageBreak:"before", pageOrientation:"portrait", pageSize:"A4"});
  content.push({text:`ΚΑΕΚ ${opt.parcel.kaek} · εμβαδόν ${fmt(opt.parcel.area_m2)} τ.μ.` + (summary.front!=null?` · πρόσωπο ${fmt(summary.front)} μ.`:"") + ` · ${summary.status||""}`, style:"t2", margin:[0,0,0,6]});
  if(summary.calc && summary.calc.length){
    content.push({text:"Υπολογισμός", style:"h2"});
    content.push({table:{widths:[150,"*"], body: summary.calc.map(r=>[{text:pdfText(r[0]),style:"lab"},{text:pdfText(r[1]),style:"valb"}])}, layout:"lightHorizontalLines", margin:[0,0,0,8]});
  }
  const L = (opt.plan && opt.plan.layers) || {};
  ORDER.forEach(k=>{ (L[k]||[]).forEach((a,i)=>{
    content.push({text:(LAB[k]||k) + ((L[k].length>1)?` (${i+1})`:""), style:"h2"});
    content.push({table:{widths:[130,"*"], body:attrRows(a)}, layout:"lightHorizontalLines", margin:[0,0,0,6]});
  }); });
  if(summary.notes && summary.notes.length) content.push({text:pdfText(summary.notes.join(" ")), style:"note"});
  content.push({text:"Τα στοιχεία είναι ενημερωτικά, από δημόσιες υπηρεσίες χαρτών του Ενιαίου Ψηφιακού Χάρτη (ΤΕΕ/ΥΠΕΝ) και του Ελληνικού Κτηματολογίου. Δεν υποκαθιστούν τη βεβαίωση όρων δόμησης της ΥΔΟΜ ούτε τον έλεγχο του μηχανικού στα ΦΕΚ. Η ακρίβεια του υποβάθρου εξαρτάται από τη γεωαναφορά του σαρωμένου διαγράμματος (RMS).", style:"note", margin:[0,10,0,0]});
  const dd = {
    pageSize:{width:P.w*pt, height:P.h*pt}, pageMargins:[MARGIN*pt, MARGIN*pt, MARGIN*pt, MARGIN*pt],
    content, defaultStyle:{font:"Roboto", fontSize:9, color:"#14213D"},
    styles:{tt:{fontSize:12, bold:true}, t2:{fontSize:9}, t3:{fontSize:7.5, color:"#5B6B85"}, sc:{fontSize:16, bold:true}, br:{fontSize:11, bold:true},
      h1:{fontSize:14, bold:true, margin:[0,0,0,4]}, h2:{fontSize:10.5, bold:true, color:"#1F4E9C", margin:[0,6,0,2]},
      lab:{fontSize:8.5, color:"#5B6B85"}, val:{fontSize:8.5}, valb:{fontSize:9.5, bold:true}, link:{fontSize:8, color:"#1F4E9C", decoration:"underline"}, note:{fontSize:8, color:"#5B6B85", italics:true}},
    info:{title:"Απόσπασμα — ΚΑΕΚ "+opt.parcel.kaek, author:"HEXIS-APP", creator:"HEXIS-APP · hexis-app.gr"}
  };
  return await new Promise((res,rej)=>{ try{ pdfMake.createPdf(dd).getBlob(b=>res(b)); }catch(e){ rej(e); } });
}

/* ---------- TIFF (γεωαναφερμένο, PackBits) + TFW ---------- */
function packbits(row){
  const out=[]; let i=0; const n=row.length;
  while(i<n){
    let j=i+1; while(j<n && j-i<128 && row[j]===row[i]) j++;
    if(j-i>=3){ out.push(257-(j-i)&255, row[i]); i=j; continue; }
    let k=i; const lit=[];
    while(k<n && lit.length<128){ if(k+2<n && row[k]===row[k+1] && row[k]===row[k+2]) break; lit.push(row[k]); k++; }
    out.push(lit.length-1); for(const b of lit) out.push(b); i=k;
  }
  return out;
}
function geoTiff(canvas, bb){
  const w=canvas.width, h=canvas.height, px=canvas.getContext("2d").getImageData(0,0,w,h).data;
  const res = (bb[2]-bb[0])/w;
  // λωρίδες: 16 γραμμές η καθεμία
  const RPS = 16, strips=[];
  for(let y=0;y<h;y+=RPS){ const bytes=[]; for(let yy=y; yy<Math.min(h,y+RPS); yy++){ const row=new Uint8Array(w*3); for(let x=0;x<w;x++){ const s=(yy*w+x)*4; row[x*3]=px[s]; row[x*3+1]=px[s+1]; row[x*3+2]=px[s+2]; } const pb=packbits(row); for(const b of pb) bytes.push(b); } strips.push(Uint8Array.from(bytes)); }
  const dataLen = strips.reduce((a,s)=>a+s.length,0);
  const geoKeys=[1,1,0,4, 1024,0,1,1, 1025,0,1,1, 3072,0,1,2100, 3076,0,1,9001];
  const dbl = (arr)=>{ const b=new DataView(new ArrayBuffer(arr.length*8)); arr.forEach((v,i)=>b.setFloat64(i*8,v,true)); return new Uint8Array(b.buffer); };
  const scaleB = dbl([res,res,0]), tieB = dbl([0,0,0,bb[0],bb[3],0]);
  const shorts = (arr)=>{ const b=new DataView(new ArrayBuffer(arr.length*2)); arr.forEach((v,i)=>b.setUint16(i*2,v,true)); return new Uint8Array(b.buffer); };
  const keysB = shorts(geoKeys), bpsB = shorts([8,8,8]);
  const longs = (arr)=>{ const b=new DataView(new ArrayBuffer(arr.length*4)); arr.forEach((v,i)=>b.setUint32(i*4,v,true)); return new Uint8Array(b.buffer); };
  const ents = []; // [tag,type,count,valueBytes|number]
  const T={SHORT:3, LONG:4, DOUBLE:12, RATIONAL:5, ASCII:2};
  const extra=[]; let off = 8; // header
  // διάταξη: header | data | IFD | extra
  const dataOff = 8; off = dataOff + dataLen; if(off%2) off++;
  const stripOffs=[]; let o=dataOff; strips.forEach(s=>{ stripOffs.push(o); o+=s.length; });
  const ifdOff = off;
  const tags = [
    [256,T.LONG,1,w],[257,T.LONG,1,h],[258,T.SHORT,3,bpsB],[259,T.SHORT,1,32773],[262,T.SHORT,1,2],
    [273,T.LONG,strips.length,longs(stripOffs)],[277,T.SHORT,1,3],[278,T.LONG,1,RPS],[279,T.LONG,strips.length,longs(strips.map(s=>s.length))],
    [282,T.RATIONAL,1,longs([DPI,1])],[283,T.RATIONAL,1,longs([DPI,1])],[284,T.SHORT,1,1],[296,T.SHORT,1,2],
    [33550,T.DOUBLE,3,scaleB],[33922,T.DOUBLE,6,tieB],[34735,T.SHORT,geoKeys.length,keysB]
  ];
  const ifdLen = 2 + tags.length*12 + 4;
  let extraOff = ifdOff + ifdLen; if(extraOff%2) extraOff++;
  const ifd = new DataView(new ArrayBuffer(ifdLen)); ifd.setUint16(0,tags.length,true);
  const extraParts=[]; let eo = extraOff;
  tags.forEach((t,i)=>{
    const b=2+i*12; ifd.setUint16(b,t[0],true); ifd.setUint16(b+2,t[1],true); ifd.setUint32(b+4,t[2],true);
    if(typeof t[3]==="number"){ if(t[1]===T.SHORT) ifd.setUint16(b+8,t[3],true); else ifd.setUint32(b+8,t[3],true); }
    else if(t[3].length<=4){ for(let k=0;k<t[3].length;k++) ifd.setUint8(b+8+k,t[3][k]); }
    else { ifd.setUint32(b+8,eo,true); extraParts.push([eo,t[3]]); eo += t[3].length; if(eo%2) eo++; }
  });
  ifd.setUint32(2+tags.length*12, 0, true);
  const total = eo, buf = new Uint8Array(total), dv=new DataView(buf.buffer);
  buf[0]=0x49; buf[1]=0x49; dv.setUint16(2,42,true); dv.setUint32(4,ifdOff,true);
  strips.forEach((s,i)=> buf.set(s, stripOffs[i]));
  buf.set(new Uint8Array(ifd.buffer), ifdOff);
  extraParts.forEach(([p,b])=> buf.set(b,p));
  const tfw = [res, 0, 0, -res, bb[0]+res/2, bb[3]-res/2].map(v=> v.toFixed(6)).join("\r\n") + "\r\n";
  return {tif:buf, tfw, res, w, h};
}

/* ---------- DXF (R2000, ΕΓΣΑ'87, μέτρα) ---------- */
function dxfText(s){ return String(s).replace(/[^\x20-\x7E]/g, c=> "\\U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4,"0")); }
function makeDxf(opt, vecs, img, tifName){
  let h = parseInt(DXF_TPL.seed, 16) + 16;
  const nh = ()=> (h++).toString(16).toUpperCase();
  const num = v => (+v).toFixed(4);
  const E = [];
  const lw = (layer, pts, closed)=>{
    if(pts.length<2) return;
    E.push("  0\nLWPOLYLINE\n  5\n"+nh()+"\n330\n17\n100\nAcDbEntity\n  8\n"+layer+"\n100\nAcDbPolyline\n 90\n"+pts.length+"\n 70\n"+(closed?1:0)+"\n"+
      pts.map(p=>" 10\n"+num(p[0])+"\n 20\n"+num(p[1])+"\n").join(""));
  };
  const tx = (layer, at, s, ht)=>{
    E.push("  0\nTEXT\n  5\n"+nh()+"\n330\n17\n100\nAcDbEntity\n  8\n"+layer+"\n100\nAcDbText\n 10\n"+num(at[0])+"\n 20\n"+num(at[1])+"\n 30\n0.0\n 40\n"+num(ht)+"\n  1\n"+dxfText(s)+"\n 72\n1\n 11\n"+num(at[0])+"\n 21\n"+num(at[1])+"\n 31\n0.0\n100\nAcDbText\n 73\n2\n");
  };
  const th = 2.5*opt.scale/1000;                      // 2,5 χλστ. στο χαρτί
  // υπόβαθρο (IMAGE) — πρώτο, για να είναι από κάτω
  const bb = opt.bbox;
  const imgEnt = DXF_TPL.img.replace("%%X%%", num(bb[0])).replace("%%Y%%", num(bb[1])).replace("%%PX%%", img.res.toFixed(8)).replace("%%PY%%", (img.resY||img.res).toFixed(8))
    .replace("%%W%%", img.w.toFixed(1)).replace("%%H%%", img.h.toFixed(1))
    .replace("%%CLIP0%%", " 14\n-0.5\n 24\n-0.5\n").replace("%%CLIP1%%", " 14\n"+(img.w-0.5).toFixed(1)+"\n 24\n"+(img.h-0.5).toFixed(1)+"\n");
  E.push(imgEnt);
  vecs.forEach(v=>{ if(v.text) tx(v.layer, v.at, v.text, th); else lw(v.layer, v.pts, v.closed); });
  (opt.parcel.neighbors||[]).forEach(n=>{ H().polysOf(n.geometry_egsa).forEach(p=> p.forEach(r=> lw("PST_KAEK_OMORA", H().openRing(r), true))); });
  H().polysOf(opt.parcel.geometry_egsa).forEach(p=> p.forEach(r=> lw("PST_KAEK", H().openRing(r), true)));
  tx("KAEK_KEIMENO", H().interiorPoint(H().mainOuter(opt.parcel.geometry_egsa)), opt.parcel.kaek, th);
  lw("PLAISIO", [[bb[0],bb[1]],[bb[2],bb[1]],[bb[2],bb[3]],[bb[0],bb[3]]], true);
  const out = DXF_TPL.tpl.replace("%%ENTITIES%%", E.join("")).replace("%%HANDSEED%%", nh())
    .split("%%F1%%").join(tifName).replace("%%W1%%", img.w.toFixed(1)).replace("%%H1%%", img.h.toFixed(1));
  return out.replace(/\n/g, "\r\n");
}

/* ---------- διάλογος ---------- */
let busy = false;
function modalHtml(st, diags){
  const sug = suggestScale(st.parcel, "A4", st.ot);
  const dOpts = diags.map((d,i)=>`<option value="${i}">ΦΕΚ ${esc(d.fek||"")} · 1:${d.scale||"—"}${d.rms!=null?` · RMS ${fmt(d.rms,2)} μ.`:""} — ${esc((d.title||"").slice(0,70))}</option>`).join("");
  return `<div class="ox-back" id="ox-back"><div class="ox-card" role="dialog" aria-modal="true" aria-label="Απόσπασμα σχεδίου">
    <div class="ox-h">Απόσπασμα σχεδίου · ΚΑΕΚ ${esc(st.parcel.kaek)}</div>
    <label class="ox-f">Κλίμακα εισαγωγής στο σχέδιο
      <select id="ox-scale">${SCALES.map(s=>`<option value="${s}"${s===sug?" selected":""}>1:${s}</option>`).join("")}</select></label>
    <label class="ox-f">Χαρτί
      <select id="ox-paper">${Object.keys(PAPER).map(k=>`<option value="${k}">${PAPER[k].label}</option>`).join("")}</select></label>
    <label class="ox-f">Υπόβαθρο (σαρωμένο διάγραμμα ΦΕΚ)
      <select id="ox-diag">${dOpts}<option value="-1"${diags.length?"":" selected"}>Χωρίς σαρωμένο διάγραμμα</option></select></label>
    <label class="ox-c"><input type="checkbox" id="ox-epsx" checked> Ψηφιοποιημένες γραμμές ΕΨΧ πάνω στο υπόβαθρο</label>
    <div class="ox-info" id="ox-info"></div>
    <div class="ox-btns">
      <button type="button" class="od-btn od-primary" id="ox-pdf">PDF απόσπασμα + όροι</button>
      <button type="button" class="od-btn od-primary" id="ox-zip">Για AutoCAD (DXF + TIFF)</button>
      <button type="button" class="od-btn" id="ox-close">Κλείσιμο</button>
    </div>
    <div class="ox-status" id="ox-status"></div>
    <div class="ox-acts" id="ox-acts">${actsHtml(null)}</div>
  </div></div>`;
}
function readOpts(st, diags){
  const scale = +document.getElementById("ox-scale").value, paper = document.getElementById("ox-paper").value;
  const di = +document.getElementById("ox-diag").value, epsx = document.getElementById("ox-epsx").checked;
  const ext = extentFor(st.parcel, scale, paper, st.ot);
  return {scale, paper, diagram: di>=0 ? diags[di] : null, diags, epsx, ot: st.ot, bbox:ext.bbox, fits:ext.fits, W:ext.W, H:ext.H, parcel:st.parcel, plan:st.plan,
    kind: st.status==="oikismos" ? "ΑΠΟΣΠΑΣΜΑ ΟΡΙΩΝ ΟΙΚΙΣΜΟΥ" : st.status==="sxedio" ? "ΑΠΟΣΠΑΣΜΑ ΡΥΜΟΤΟΜΙΚΟΥ ΣΧΕΔΙΟΥ" : "ΑΠΟΣΠΑΣΜΑ ΠΟΛΕΟΔΟΜΙΚΩΝ ΣΤΟΙΧΕΙΩΝ"};
}
function info(st, diags){
  const o = readOpts(st, diags), el = document.getElementById("ox-info");
  let t = `Περιοχή αποσπάσματος: ${fmt(o.W,1)} × ${fmt(o.H,1)} μ. (ΕΓΣΑ΄87). Στο DXF τα κείμενα είναι 2,5 χλστ. στην 1:${o.scale}.`;
  if(st.ot) t = `Το απόσπασμα περιλαμβάνει ολόκληρο το <b>Ο.Τ. ${esc(st.ot.num||"")}</b> του γεωτεμαχίου. ` + t;
  if(!o.fits) t = `⚠ ${st.ot ? "Το Ο.Τ." : "Το γεωτεμάχιο"} δεν χωράει ολόκληρο στην 1:${o.scale} σε ${PAPER[o.paper].label} — διάλεξε μεγαλύτερη κλίμακα (π.χ. 1:${SCALES.find(s=>extentFor(st.parcel,s,o.paper,st.ot).fits)||1000}) ή Α3.<br>` + t;
  if(o.diagram && o.diagram.scale && o.scale < o.diagram.scale/2) t += `<br>ℹ️ Το διάγραμμα είναι σε 1:${o.diagram.scale} — σε 1:${o.scale} θα φαίνεται μεγεθυμένο (ακρίβεια RMS ${o.diagram.rms!=null?fmt(o.diagram.rms,2)+" μ.":"—"}).`;
  el.innerHTML = t;
}
function setStatus(t, err){ const el=document.getElementById("ox-status"); if(el){ el.innerHTML=t; el.classList.toggle("ox-err", !!err); } }
function download(blob, name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function fname(o, ext){ return `apospasma_${o.parcel.kaek}_1-${o.scale}.${ext}`; }

async function runPdf(st, diags){
  const o = readOpts(st, diags);
  setStatus("Σύνθεση υποβάθρου…");
  const base = await baseCanvas(o);
  setStatus("Δημιουργία PDF…");
  const pdf = await makePdf(o, decorate(base, o), Object.assign({}, st.summary, {notes:base.notes}));
  download(pdf, fname(o,"pdf"));
  setStatus("✅ Έτοιμο το PDF" + (base.notes.length ? " — " + esc(base.notes.join(" ")) : "."));
  return {o, base, pdf};
}
async function runZip(st, diags){
  const o = readOpts(st, diags);
  await need(["zip"]);
  setStatus("Σύνθεση υποβάθρου…");
  const base = await baseCanvas(o);
  setStatus("Γραμμές σχεδίου από τον ΕΨΧ…");
  const vecs = await vectors(o.bbox).catch(()=>[]);
  setStatus("Γεωαναφερμένο TIFF και DXF…");
  const tifName = fname(o,"tif");
  const gt = geoTiff(base.canvas, o.bbox);
  const dxf = makeDxf(o, vecs, gt, tifName);
  setStatus("PDF για το ίδιο απόσπασμα…");
  let pdf = null; try{ pdf = await makePdf(o, decorate(base, o), Object.assign({}, st.summary, {notes:base.notes})); }catch(e){ console.warn(e); }
  const zip = new JSZip();
  zip.file(fname(o,"dxf"), dxf);
  zip.file(tifName, gt.tif);
  zip.file(fname(o,"tfw"), gt.tfw);
  zip.file(fname(o,"prj"), PRJ);
  if(pdf) zip.file(fname(o,"pdf"), pdf);
  zip.file("ODIGIES.txt", [
    "HEXIS-APP · Απόσπασμα σχεδίου — ΚΑΕΚ " + o.parcel.kaek + " · κλίμακα 1:" + o.scale,
    "",
    "1. Αποσυμπίεσε ΟΛΑ τα αρχεία στον ίδιο φάκελο.",
    "2. Άνοιξε το " + fname(o,"dxf") + " (ή κάνε INSERT/ATTACH στο σχέδιό σου με σημείο 0,0 και κλίμακα 1).",
    "   Μονάδες: μέτρα, συντεταγμένες ΕΓΣΑ'87 — το υπόβαθρο (TIFF) μπαίνει αυτόματα στη σωστή θέση.",
    "3. Layers: PST_KAEK (περίγραμμα γεωτεμαχίου), PST_KAEK_OMORA, KAEK_KEIMENO, RYMOTOMIKI, OIKODOMIKI,",
    "   POL_GRAMMES, OT, OT_ARITHMOS, ORIO_OIKISMOU, KOINOXRISTA, PLAISIO, YPOVATHRO_EPSX (εικόνα).",
    "4. Το " + tifName + " είναι γεωαναφερμένο (GeoTIFF + " + fname(o,"tfw") + ") — μπαίνει και σε GIS.",
    "   Μέγεθος pixel: " + gt.res.toFixed(4) + " μ.",
    "5. Για εκτύπωση σε κλίμακα 1:" + o.scale + ": στο Layout βάλε viewport με κλίμακα 1:" + o.scale + " (1 μ. = " + (1000/o.scale) + " χλστ.).",
    "",
    "Υπόβαθρο: " + (o.diagramUsed ? "διάγραμμα ΦΕΚ " + (o.diagramUsed.fek||"") + " (αρχική κλίμακα 1:" + (o.diagramUsed.scale||"—") + ", RMS " + (o.diagramUsed.rms!=null?o.diagramUsed.rms:"—") + " μ.)" : "ψηφιοποιημένα στοιχεία ΕΨΧ"),
    "Πηγές: Ενιαίος Ψηφιακός Χάρτης (ΤΕΕ/ΥΠΕΝ), Ελληνικό Κτηματολόγιο. Ενημερωτικό — δεν υποκαθιστά βεβαίωση ΥΔΟΜ."
  ].join("\r\n"));
  const blob = await zip.generateAsync({type:"blob", compression:"DEFLATE"});
  download(blob, fname(o,"zip"));
  setStatus("✅ Έτοιμο το ZIP (DXF + TIFF + TFW" + (pdf?" + PDF":"") + ")" + (base.notes.length ? " — " + esc(base.notes.join(" ")) : "."));
  return {o, base, dxf, gt, vecs, zip:blob};
}

window.HXOroiExport = {
  async open(){
    const st = H().state();
    if(!st || !st.parcel) return;
    const ip = H().interiorPoint(H().mainOuter(st.parcel.geometry_egsa));
    let diags = [];
    try{ diags = await listDiagrams(ip[0], ip[1]); }catch(e){ console.warn(e); }
    st.ot = await otOf(ip[0], ip[1]).catch(()=>null);
    const wrap = document.createElement("div"); wrap.innerHTML = modalHtml(st, diags); document.body.appendChild(wrap.firstChild);
    const close = ()=>{ const b=document.getElementById("ox-back"); if(b) b.remove(); };
    document.getElementById("ox-close").addEventListener("click", close);
    document.getElementById("ox-back").addEventListener("click", e=>{ if(e.target.id==="ox-back" && !busy) close(); });
    let acts = null, actsSeq = 0;
    const loadActs = async ()=>{
      const seq = ++actsSeq, o = readOpts(st, diags), box = document.getElementById("ox-acts"); if(!box) return;
      box.innerHTML = actsHtml(null);
      try{ const a = await actsIn(o.bbox); if(seq!==actsSeq) return; acts = a; box.innerHTML = actsHtml(a); }
      catch(e){ if(seq===actsSeq) box.innerHTML = `<div class="ox-acts-e">Οι πράξεις δεν φορτώθηκαν: ${esc(e.message||e)}</div>`; }
    };
    ["ox-scale","ox-paper","ox-diag","ox-epsx"].forEach(id=> document.getElementById(id).addEventListener("change", ()=>info(st, diags)));
    ["ox-scale","ox-paper"].forEach(id=> document.getElementById(id).addEventListener("change", loadActs));
    info(st, diags); loadActs();
    const guard = fn => async ()=>{
      if(busy) return; busy = true; document.querySelectorAll(".ox-btns button,.ox-dg").forEach(b=>b.disabled=true);
      try{ await fn(st, diags); }catch(e){ console.error(e); setStatus("❌ " + esc(e.message||String(e)), true); }
      finally{ busy=false; document.querySelectorAll(".ox-btns button,.ox-dg").forEach(b=>b.disabled=false); }
    };
    document.getElementById("ox-pdf").addEventListener("click", guard(runPdf));
    document.getElementById("ox-zip").addEventListener("click", guard(runZip));
    document.getElementById("ox-acts").addEventListener("click", e=>{
      const b = e.target.closest(".ox-dg"); if(!b || !acts) return;
      const a = acts[+b.dataset.a], d = a && a.diags[+b.dataset.d]; if(!d) return;
      guard(()=> runActDiagram(st, d, a))();
    });
  },
  _test: { geoTiff, makeDxf, packbits, extentFor, suggestScale, listDiagrams, vectors, runPdf, runZip, actsIn, runActDiagram }
};

const css = document.createElement("style");
css.textContent = `
.ox-back{position:fixed;inset:0;background:rgba(20,33,61,.45);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px}
.ox-card{background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:92vh;overflow:auto;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.25)}
.ox-h{font-weight:800;font-size:16px;color:var(--navy);margin-bottom:10px}
.ox-f{display:block;font-size:13px;color:var(--muted);margin:8px 0}
.ox-f select{display:block;width:100%;margin-top:4px;font-family:var(--sans);font-size:14px;border:1.5px solid var(--line);border-radius:9px;padding:8px 10px;background:#fff;color:var(--navy)}
.ox-c{display:flex;align-items:center;gap:7px;font-size:13.5px;color:#25314D;margin:10px 0}
.ox-info{font-size:12.5px;color:#25314D;background:#F4F7FC;border-radius:8px;padding:8px 10px;line-height:1.5}
.ox-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.ox-btns button:disabled{opacity:.55;cursor:wait}
.ox-status{font-size:13px;color:#25314D;margin-top:10px;min-height:18px}
.ox-status.ox-err{color:#7A1A12}
.ox-acts{border-top:1px solid var(--line);margin-top:12px;padding-top:10px}
.ox-acts-h{font-weight:800;font-size:13.5px;color:var(--navy);margin-bottom:6px}
.ox-acts-e,.ox-acts-n{font-size:12.5px;color:var(--muted);line-height:1.45}
.ox-acts-n{margin-top:8px}
.ox-act{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 10px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px;color:#25314D}
.ox-act>div:first-child{flex:1 1 240px;min-width:0}
.ox-at{font-size:12px;color:var(--muted);margin-top:2px}
.ox-what{color:#1D4E89}
.ox-ab{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start}
.ox-sb{appearance:none;border:1.5px solid var(--blue);background:#fff;color:var(--blue);font-family:var(--sans);font-size:12.5px;font-weight:700;border-radius:8px;padding:5px 9px;cursor:pointer;text-decoration:none;white-space:nowrap}
.ox-sb:hover{background:var(--soft)}
.ox-sb:disabled{opacity:.55;cursor:wait}
`;
document.head.appendChild(css);
})();
