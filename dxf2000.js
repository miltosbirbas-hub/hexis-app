/* HEXIS-APP · dxf2000.js — κοινός αναγνώστης/συγγραφέας DXF (από το HEXIS GEOmetry) */
/* HEXIS — DXF R2000 (AC1015) για ΔΓΜ: LWPOLYLINE / TEXT / POINT σε πρότυπο με τα layers του ΠΙΝΑΚΑ Α.
 * Το πρότυπο (TEMPLATE) παράγεται με ezdxf και ενσωματώνεται στο build. Εδώ απλώς προστίθενται οντότητες
 * στο ENTITIES, με νέα handles από το $HANDSEED, και ενημερώνονται $HANDSEED/$EXTMIN/$EXTMAX.
 */
(function (root) {
  'use strict';
  var TEMPLATE = "  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1015\n  9\n$ACADMAINTVER\n 70\n6\n  9\n$DWGCODEPAGE\n  3\nANSI_1252\n  9\n$INSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$EXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$EXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$LIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$LIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$ORTHOMODE\n 70\n0\n  9\n$REGENMODE\n 70\n1\n  9\n$FILLMODE\n 70\n1\n  9\n$QTEXTMODE\n 70\n0\n  9\n$MIRRTEXT\n 70\n1\n  9\n$LTSCALE\n 40\n1.0\n  9\n$ATTMODE\n 70\n1\n  9\n$TEXTSIZE\n 40\n2.5\n  9\n$TRACEWID\n 40\n1.0\n  9\n$TEXTSTYLE\n  7\nStandard\n  9\n$CLAYER\n  8\n0\n  9\n$CELTYPE\n  6\nByLayer\n  9\n$CECOLOR\n 62\n256\n  9\n$CELTSCALE\n 40\n1.0\n  9\n$DISPSILH\n 70\n0\n  9\n$DIMSCALE\n 40\n1.0\n  9\n$DIMASZ\n 40\n2.5\n  9\n$DIMEXO\n 40\n0.625\n  9\n$DIMDLI\n 40\n3.75\n  9\n$DIMRND\n 40\n0.0\n  9\n$DIMDLE\n 40\n0.0\n  9\n$DIMEXE\n 40\n1.25\n  9\n$DIMTP\n 40\n0.0\n  9\n$DIMTM\n 40\n0.0\n  9\n$DIMTXT\n 40\n2.5\n  9\n$DIMCEN\n 40\n2.5\n  9\n$DIMTSZ\n 40\n0.0\n  9\n$DIMTOL\n 70\n0\n  9\n$DIMLIM\n 70\n0\n  9\n$DIMTIH\n 70\n0\n  9\n$DIMTOH\n 70\n0\n  9\n$DIMSE1\n 70\n0\n  9\n$DIMSE2\n 70\n0\n  9\n$DIMTAD\n 70\n1\n  9\n$DIMZIN\n 70\n8\n  9\n$DIMBLK\n  1\n\n  9\n$DIMASO\n 70\n1\n  9\n$DIMSHO\n 70\n1\n  9\n$DIMPOST\n  1\n\n  9\n$DIMAPOST\n  1\n\n  9\n$DIMALT\n 70\n0\n  9\n$DIMALTD\n 70\n3\n  9\n$DIMALTF\n 40\n0.03937007874\n  9\n$DIMLFAC\n 40\n1.0\n  9\n$DIMTOFL\n 70\n1\n  9\n$DIMTVP\n 40\n0.0\n  9\n$DIMTIX\n 70\n0\n  9\n$DIMSOXD\n 70\n0\n  9\n$DIMSAH\n 70\n0\n  9\n$DIMBLK1\n  1\n\n  9\n$DIMBLK2\n  1\n\n  9\n$DIMSTYLE\n  2\nISO-25\n  9\n$DIMCLRD\n 70\n0\n  9\n$DIMCLRE\n 70\n0\n  9\n$DIMCLRT\n 70\n0\n  9\n$DIMTFAC\n 40\n1.0\n  9\n$DIMGAP\n 40\n0.625\n  9\n$DIMJUST\n 70\n0\n  9\n$DIMSD1\n 70\n0\n  9\n$DIMSD2\n 70\n0\n  9\n$DIMTOLJ\n 70\n0\n  9\n$DIMTZIN\n 70\n8\n  9\n$DIMALTZ\n 70\n0\n  9\n$DIMALTTZ\n 70\n0\n  9\n$DIMUPT\n 70\n0\n  9\n$DIMDEC\n 70\n2\n  9\n$DIMTDEC\n 70\n2\n  9\n$DIMALTU\n 70\n2\n  9\n$DIMALTTD\n 70\n3\n  9\n$DIMTXSTY\n  7\nStandard\n  9\n$DIMAUNIT\n 70\n0\n  9\n$DIMADEC\n 70\n0\n  9\n$DIMALTRND\n 40\n0.0\n  9\n$DIMAZIN\n 70\n0\n  9\n$DIMDSEP\n 70\n44\n  9\n$DIMATFIT\n 70\n3\n  9\n$DIMFRAC\n 70\n0\n  9\n$DIMLDRBLK\n  1\n\n  9\n$DIMLUNIT\n 70\n2\n  9\n$DIMLWD\n 70\n-2\n  9\n$DIMLWE\n 70\n-2\n  9\n$DIMTMOVE\n 70\n0\n  9\n$LUNITS\n 70\n2\n  9\n$LUPREC\n 70\n4\n  9\n$SKETCHINC\n 40\n1.0\n  9\n$FILLETRAD\n 40\n10.0\n  9\n$AUNITS\n 70\n0\n  9\n$AUPREC\n 70\n2\n  9\n$MENU\n  1\n.\n  9\n$ELEVATION\n 40\n0.0\n  9\n$PELEVATION\n 40\n0.0\n  9\n$THICKNESS\n 40\n0.0\n  9\n$LIMCHECK\n 70\n0\n  9\n$CHAMFERA\n 40\n0.0\n  9\n$CHAMFERB\n 40\n0.0\n  9\n$CHAMFERC\n 40\n0.0\n  9\n$CHAMFERD\n 40\n0.0\n  9\n$SKPOLY\n 70\n0\n  9\n$TDCREATE\n 40\n2461333.5968171298\n  9\n$TDUCREATE\n 40\n2458532.153996898\n  9\n$TDUPDATE\n 40\n2461333.5968171298\n  9\n$TDUUPDATE\n 40\n2458532.1544311\n  9\n$TDINDWG\n 40\n0.0\n  9\n$TDUSRTIMER\n 40\n0.0\n  9\n$USRTIMER\n 70\n1\n  9\n$ANGBASE\n 50\n0.0\n  9\n$ANGDIR\n 70\n0\n  9\n$PDMODE\n 70\n0\n  9\n$PDSIZE\n 40\n0.0\n  9\n$PLINEWID\n 40\n0.0\n  9\n$SPLFRAME\n 70\n0\n  9\n$SPLINETYPE\n 70\n6\n  9\n$SPLINESEGS\n 70\n8\n  9\n$HANDSEED\n  5\n45\n  9\n$SURFTAB1\n 70\n6\n  9\n$SURFTAB2\n 70\n6\n  9\n$SURFTYPE\n 70\n6\n  9\n$SURFU\n 70\n6\n  9\n$SURFV\n 70\n6\n  9\n$UCSBASE\n  2\n\n  9\n$UCSNAME\n  2\n\n  9\n$UCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$UCSORTHOREF\n  2\n\n  9\n$UCSORTHOVIEW\n 70\n0\n  9\n$UCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSBASE\n  2\n\n  9\n$PUCSNAME\n  2\n\n  9\n$PUCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$PUCSORTHOREF\n  2\n\n  9\n$PUCSORTHOVIEW\n 70\n0\n  9\n$PUCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$USERI1\n 70\n0\n  9\n$USERI2\n 70\n0\n  9\n$USERI3\n 70\n0\n  9\n$USERI4\n 70\n0\n  9\n$USERI5\n 70\n0\n  9\n$USERR1\n 40\n0.0\n  9\n$USERR2\n 40\n0.0\n  9\n$USERR3\n 40\n0.0\n  9\n$USERR4\n 40\n0.0\n  9\n$USERR5\n 40\n0.0\n  9\n$WORLDVIEW\n 70\n1\n  9\n$SHADEDGE\n 70\n3\n  9\n$SHADEDIF\n 70\n70\n  9\n$TILEMODE\n 70\n1\n  9\n$MAXACTVP\n 70\n64\n  9\n$PINSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PLIMCHECK\n 70\n0\n  9\n$PEXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$PEXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$PLIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$PLIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$UNITMODE\n 70\n0\n  9\n$VISRETAIN\n 70\n1\n  9\n$PLINEGEN\n 70\n0\n  9\n$PSLTSCALE\n 70\n1\n  9\n$TREEDEPTH\n 70\n3020\n  9\n$CMLSTYLE\n  2\nStandard\n  9\n$CMLJUST\n 70\n0\n  9\n$CMLSCALE\n 40\n20.0\n  9\n$PROXYGRAPHICS\n 70\n1\n  9\n$MEASUREMENT\n 70\n1\n  9\n$CELWEIGHT\n370\n-1\n  9\n$ENDCAPS\n280\n0\n  9\n$JOINSTYLE\n280\n0\n  9\n$LWDISPLAY\n290\n0\n  9\n$INSUNITS\n 70\n6\n  9\n$HYPERLINKBASE\n  1\n\n  9\n$STYLESHEET\n  1\n\n  9\n$XEDIT\n290\n1\n  9\n$CEPSNTYPE\n380\n0\n  9\n$PSTYLEMODE\n290\n1\n  9\n$FINGERPRINTGUID\n  2\n{4C4011E9-DF32-44DF-9F97-8100C289BD12}\n  9\n$VERSIONGUID\n  2\n{E5547A5A-82DF-443E-AD97-45BAFCEC7AB3}\n  9\n$EXTNAMES\n290\n1\n  9\n$PSVPSCALE\n 40\n0.0\n  9\n$OLESTARTUP\n290\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nCLASSES\n  0\nCLASS\n  1\nACDBDICTIONARYWDFLT\n  2\nAcDbDictionaryWithDefault\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nSUN\n  2\nAcDbSun\n  3\nSCENEOE\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nVISUALSTYLE\n  2\nAcDbVisualStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMATERIAL\n  2\nAcDbMaterial\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nSCALE\n  2\nAcDbScale\n  3\nObjectDBX Classes\n 90\n1153\n280\n0\n281\n0\n  0\nCLASS\n  1\nTABLESTYLE\n  2\nAcDbTableStyle\n  3\nObjectDBX Classes\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nMLEADERSTYLE\n  2\nAcDbMLeaderStyle\n  3\nACDB_MLEADERSTYLE_CLASS\n 90\n4095\n280\n0\n281\n0\n  0\nCLASS\n  1\nDICTIONARYVAR\n  2\nAcDbDictionaryVar\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nCELLSTYLEMAP\n  2\nAcDbCellStyleMap\n  3\nObjectDBX Classes\n 90\n1152\n280\n0\n281\n0\n  0\nCLASS\n  1\nMENTALRAYRENDERSETTINGS\n  2\nAcDbMentalRayRenderSettings\n  3\nSCENEOE\n 90\n1024\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBDETAILVIEWSTYLE\n  2\nAcDbDetailViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBSECTIONVIEWSTYLE\n  2\nAcDbSectionViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n280\n0\n281\n0\n  0\nCLASS\n  1\nRASTERVARIABLES\n  2\nAcDbRasterVariables\n  3\nISM\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBPLACEHOLDER\n  2\nAcDbPlaceHolder\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nLAYOUT\n  2\nAcDbLayout\n  3\nObjectDBX Classes\n 90\n0\n280\n0\n281\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nVPORT\n  5\n8\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nVPORT\n  5\n23\n330\n8\n100\nAcDbSymbolTableRecord\n100\nAcDbViewportTableRecord\n  2\n*Active\n 70\n0\n 10\n0.0\n 20\n0.0\n 11\n1.0\n 21\n1.0\n 12\n0.0\n 22\n0.0\n 13\n0.0\n 23\n0.0\n 14\n0.5\n 24\n0.5\n 15\n0.5\n 25\n0.5\n 16\n0.0\n 26\n0.0\n 36\n1.0\n 17\n0.0\n 27\n0.0\n 37\n0.0\n 40\n1000.0\n 41\n1.34\n 42\n50.0\n 43\n0.0\n 44\n0.0\n 50\n0.0\n 51\n0.0\n 71\n0\n 72\n1000\n 73\n1\n 74\n3\n 75\n0\n 76\n0\n 77\n0\n 78\n0\n281\n0\n 65\n0\n146\n0.0\n  0\nENDTAB\n  0\nTABLE\n  2\nLTYPE\n  5\n2\n330\n0\n100\nAcDbSymbolTable\n 70\n4\n  0\nLTYPE\n  5\n24\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByBlock\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n25\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByLayer\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n26\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nContinuous\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n2F\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nDASHED\n 70\n0\n  3\nDashed __ __ __\n 72\n65\n 73\n2\n 40\n1.2\n 49\n0.8\n 74\n0\n 49\n-0.4\n 74\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nLAYER\n  5\n1\n330\n0\n100\nAcDbSymbolTable\n 70\n20\n  0\nLAYER\n  5\n27\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n0\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n28\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDefpoints\n 70\n0\n 62\n7\n  6\nContinuous\n290\n0\n370\n-3\n390\n13\n  0\nLAYER\n  5\n30\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPST_KAEK\n 70\n0\n 62\n16\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n31\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKYROSH\n 70\n0\n 62\n2\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n32\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nBOUND_UNIMPL\n 70\n0\n 62\n61\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n33\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nVST\n 70\n0\n 62\n233\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n34\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEAS\n 70\n0\n 62\n233\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n35\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDBOUND_FOR\n 70\n0\n 62\n94\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n36\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nTOPO_PROP\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n37\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nVST_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n38\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEAS_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n39\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDGM_PROP_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3A\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_D\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3B\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_A\n 70\n0\n 62\n6\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3C\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEI_PNT\n 70\n0\n 62\n152\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3D\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nLINE_XM_VST\n 70\n0\n 62\n1\n  6\nDASHED\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3E\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nFOREST_FINAL\n 70\n0\n 62\n14\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n3F\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKORYFES\n 70\n0\n 62\n80\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n40\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEIA\n 70\n0\n 62\n152\n  6\nContinuous\n370\n-3\n390\n13\n  0\nLAYER\n  5\n41\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_EKTOS_KAEK\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n  0\nENDTAB\n  0\nTABLE\n  2\nSTYLE\n  5\n5\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nSTYLE\n  5\n29\n330\n5\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n  2\nStandard\n 70\n0\n 40\n0.0\n 41\n1.0\n 50\n0.0\n 71\n0\n 42\n2.5\n  3\ntxt\n  4\n\n  0\nENDTAB\n  0\nTABLE\n  2\nVIEW\n  5\n7\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nUCS\n  5\n6\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nAPPID\n  5\n3\n330\n0\n100\nAcDbSymbolTable\n 70\n3\n  0\nAPPID\n  5\n2A\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nACAD\n 70\n0\n  0\nAPPID\n  5\n42\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nHATCHBACKGROUNDCOLOR\n 70\n0\n  0\nAPPID\n  5\n43\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nEZDXF\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nDIMSTYLE\n  5\n4\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n100\nAcDbDimStyleTable\n  0\nDIMSTYLE\n105\n2B\n330\n4\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n  2\nStandard\n 70\n0\n  3\n\n  4\n\n 40\n1.0\n 41\n2.5\n 42\n0.625\n 43\n3.75\n 44\n1.25\n 45\n0.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n140\n2.5\n141\n2.5\n142\n0.0\n143\n0.03937007874\n144\n1.0\n145\n0.0\n146\n1.0\n147\n0.625\n148\n0.0\n 71\n0\n 72\n0\n 73\n0\n 74\n0\n 75\n0\n 76\n0\n 77\n1\n 78\n8\n 79\n3\n170\n0\n171\n3\n172\n1\n173\n0\n174\n0\n175\n0\n176\n0\n177\n0\n178\n0\n179\n2\n271\n2\n272\n2\n273\n2\n274\n3\n275\n0\n276\n0\n277\n2\n278\n44\n279\n0\n280\n0\n281\n0\n282\n0\n283\n0\n284\n8\n285\n0\n286\n0\n288\n0\n289\n3\n371\n-2\n372\n-2\n  0\nENDTAB\n  0\nTABLE\n  2\nBLOCK_RECORD\n  5\n9\n330\n0\n100\nAcDbSymbolTable\n 70\n2\n  0\nBLOCK_RECORD\n  5\n17\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Model_Space\n340\n1A\n  0\nBLOCK_RECORD\n  5\n1B\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Paper_Space\n340\n1E\n  0\nENDTAB\n  0\nENDSEC\n  0\nSECTION\n  2\nBLOCKS\n  0\nBLOCK\n  5\n18\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Model_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Model_Space\n  1\n\n  0\nENDBLK\n  5\n19\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nBLOCK\n  5\n1C\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Paper_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Paper_Space\n  1\n\n  0\nENDBLK\n  5\n1D\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nSECTION\n  2\nOBJECTS\n  0\nDICTIONARY\n  5\nA\n330\n0\n100\nAcDbDictionary\n281\n1\n  3\nACAD_COLOR\n350\nB\n  3\nACAD_GROUP\n350\nC\n  3\nACAD_LAYOUT\n350\nD\n  3\nACAD_MATERIAL\n350\nE\n  3\nACAD_MLEADERSTYLE\n350\nF\n  3\nACAD_MLINESTYLE\n350\n10\n  3\nACAD_PLOTSETTINGS\n350\n11\n  3\nACAD_PLOTSTYLENAME\n350\n12\n  3\nACAD_SCALELIST\n350\n14\n  3\nACAD_TABLESTYLE\n350\n15\n  3\nACAD_VISUALSTYLE\n350\n16\n  3\nEZDXF_META\n350\n2D\n  0\nDICTIONARY\n  5\nB\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nC\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nD\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nModel\n350\n1A\n  3\nLayout1\n350\n1E\n  0\nDICTIONARY\n  5\nE\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nByBlock\n350\n1F\n  3\nByLayer\n350\n20\n  3\nGlobal\n350\n21\n  0\nDICTIONARY\n  5\nF\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n2C\n  0\nDICTIONARY\n  5\n10\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n22\n  0\nDICTIONARY\n  5\n11\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nACDBDICTIONARYWDFLT\n  5\n12\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nNormal\n350\n13\n100\nAcDbDictionaryWithDefault\n340\n13\n  0\nACDBPLACEHOLDER\n  5\n13\n330\n12\n  0\nDICTIONARY\n  5\n14\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n15\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n16\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nLAYOUT\n  5\n1A\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n1024\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nModel\n 70\n1\n 71\n0\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n17\n  0\nLAYOUT\n  5\n1E\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n0\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nLayout1\n 70\n1\n 71\n1\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n1B\n  0\nMATERIAL\n  5\n1F\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByBlock\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n20\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByLayer\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n21\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nGlobal\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMLINESTYLE\n  5\n22\n102\n{ACAD_REACTORS\n330\n10\n102\n}\n330\n10\n100\nAcDbMlineStyle\n  2\nStandard\n 70\n0\n  3\n\n 62\n256\n 51\n90.0\n 52\n90.0\n 71\n2\n 49\n0.5\n 62\n256\n  6\nBYLAYER\n 49\n-0.5\n 62\n256\n  6\nBYLAYER\n  0\nMLEADERSTYLE\n  5\n2C\n102\n{ACAD_REACTORS\n330\nF\n102\n}\n330\nF\n100\nAcDbMLeaderStyle\n179\n2\n170\n2\n171\n1\n172\n0\n 90\n2\n 40\n0.0\n 41\n0.0\n173\n1\n 91\n-1056964608\n 92\n-2\n290\n1\n 42\n2.0\n291\n1\n 43\n8.0\n  3\nStandard\n 44\n4.0\n300\n\n342\n29\n174\n1\n175\n1\n176\n0\n178\n1\n 93\n-1056964608\n 45\n4.0\n292\n0\n297\n0\n 46\n4.0\n 94\n-1056964608\n 47\n1.0\n 49\n1.0\n140\n1.0\n294\n1\n141\n0.0\n177\n0\n142\n1.0\n295\n0\n296\n0\n143\n3.75\n271\n0\n272\n9\n273\n9\n  0\nDICTIONARY\n  5\n2D\n330\nA\n100\nAcDbDictionary\n280\n1\n281\n1\n  3\nCREATED_BY_EZDXF\n350\n2E\n  3\nWRITTEN_BY_EZDXF\n350\n44\n  0\nDICTIONARYVAR\n  5\n2E\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-10-19T11:19:25.828641+00:00\n  0\nDICTIONARYVAR\n  5\n44\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-10-19T11:19:25.830852+00:00\n  0\nENDSEC\n  0\nEOF\n";
  var MSP_OWNER = "17";
  var TEMPLATE2018 = "  0\nSECTION\n  2\nHEADER\n  9\n$ACADVER\n  1\nAC1032\n  9\n$ACADMAINTVER\n 90\n4\n  9\n$DWGCODEPAGE\n  3\nANSI_1252\n  9\n$LASTSAVEDBY\n  1\nezdxf\n  9\n$REQUIREDVERSIONS\n160\n0\n  9\n$INSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$EXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$EXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$LIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$LIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$ORTHOMODE\n 70\n0\n  9\n$REGENMODE\n 70\n1\n  9\n$FILLMODE\n 70\n1\n  9\n$QTEXTMODE\n 70\n0\n  9\n$MIRRTEXT\n 70\n1\n  9\n$LTSCALE\n 40\n1.0\n  9\n$ATTMODE\n 70\n1\n  9\n$TEXTSIZE\n 40\n2.5\n  9\n$TRACEWID\n 40\n1.0\n  9\n$TEXTSTYLE\n  7\nArial\n  9\n$CTABLESTYLE\n  7\nStandard\n  9\n$CLAYER\n  8\n0\n  9\n$CELTYPE\n  6\nByLayer\n  9\n$CECOLOR\n 62\n256\n  9\n$CELTSCALE\n 40\n1.0\n  9\n$DISPSILH\n 70\n0\n  9\n$DIMSCALE\n 40\n1.0\n  9\n$DIMASZ\n 40\n2.5\n  9\n$DIMEXO\n 40\n0.625\n  9\n$DIMDLI\n 40\n3.75\n  9\n$DIMRND\n 40\n0.0\n  9\n$DIMDLE\n 40\n0.0\n  9\n$DIMEXE\n 40\n1.25\n  9\n$DIMTP\n 40\n0.0\n  9\n$DIMTM\n 40\n0.0\n  9\n$DIMTXT\n 40\n2.5\n  9\n$DIMCEN\n 40\n2.5\n  9\n$DIMTSZ\n 40\n0.0\n  9\n$DIMTOL\n 70\n0\n  9\n$DIMLIM\n 70\n0\n  9\n$DIMTIH\n 70\n0\n  9\n$DIMTOH\n 70\n0\n  9\n$DIMSE1\n 70\n0\n  9\n$DIMSE2\n 70\n0\n  9\n$DIMTAD\n 70\n1\n  9\n$DIMZIN\n 70\n8\n  9\n$DIMBLK\n  1\n\n  9\n$DIMASO\n 70\n1\n  9\n$DIMSHO\n 70\n1\n  9\n$DIMPOST\n  1\n\n  9\n$DIMAPOST\n  1\n\n  9\n$DIMALT\n 70\n0\n  9\n$DIMALTD\n 70\n3\n  9\n$DIMALTF\n 40\n0.03937007874\n  9\n$DIMLFAC\n 40\n1.0\n  9\n$DIMTOFL\n 70\n1\n  9\n$DIMTVP\n 40\n0.0\n  9\n$DIMTIX\n 70\n0\n  9\n$DIMSOXD\n 70\n0\n  9\n$DIMSAH\n 70\n0\n  9\n$DIMBLK1\n  1\n\n  9\n$DIMBLK2\n  1\n\n  9\n$DIMSTYLE\n  2\nISO-25\n  9\n$DIMCLRD\n 70\n0\n  9\n$DIMCLRE\n 70\n0\n  9\n$DIMCLRT\n 70\n0\n  9\n$DIMTFAC\n 40\n1.0\n  9\n$DIMGAP\n 40\n0.625\n  9\n$DIMJUST\n 70\n0\n  9\n$DIMSD1\n 70\n0\n  9\n$DIMSD2\n 70\n0\n  9\n$DIMTOLJ\n 70\n0\n  9\n$DIMTZIN\n 70\n8\n  9\n$DIMALTZ\n 70\n0\n  9\n$DIMALTTZ\n 70\n0\n  9\n$DIMUPT\n 70\n0\n  9\n$DIMDEC\n 70\n2\n  9\n$DIMTDEC\n 70\n2\n  9\n$DIMALTU\n 70\n2\n  9\n$DIMALTTD\n 70\n3\n  9\n$DIMTXSTY\n  7\nStandard\n  9\n$DIMAUNIT\n 70\n0\n  9\n$DIMADEC\n 70\n0\n  9\n$DIMALTRND\n 40\n0.0\n  9\n$DIMAZIN\n 70\n0\n  9\n$DIMDSEP\n 70\n44\n  9\n$DIMATFIT\n 70\n3\n  9\n$DIMFRAC\n 70\n0\n  9\n$DIMLDRBLK\n  1\n\n  9\n$DIMLUNIT\n 70\n2\n  9\n$DIMLWD\n 70\n-2\n  9\n$DIMLWE\n 70\n-2\n  9\n$DIMTMOVE\n 70\n0\n  9\n$DIMFXL\n 40\n1.0\n  9\n$DIMFXLON\n 70\n0\n  9\n$DIMJOGANG\n 40\n0.785398163397\n  9\n$DIMTFILL\n 70\n0\n  9\n$DIMTFILLCLR\n 70\n0\n  9\n$DIMARCSYM\n 70\n0\n  9\n$DIMLTYPE\n  6\n\n  9\n$DIMLTEX1\n  6\n\n  9\n$DIMLTEX2\n  6\n\n  9\n$DIMTXTDIRECTION\n 70\n0\n  9\n$LUNITS\n 70\n2\n  9\n$LUPREC\n 70\n4\n  9\n$SKETCHINC\n 40\n1.0\n  9\n$FILLETRAD\n 40\n10.0\n  9\n$AUNITS\n 70\n0\n  9\n$AUPREC\n 70\n2\n  9\n$MENU\n  1\n.\n  9\n$ELEVATION\n 40\n0.0\n  9\n$PELEVATION\n 40\n0.0\n  9\n$THICKNESS\n 40\n0.0\n  9\n$LIMCHECK\n 70\n0\n  9\n$CHAMFERA\n 40\n0.0\n  9\n$CHAMFERB\n 40\n0.0\n  9\n$CHAMFERC\n 40\n0.0\n  9\n$CHAMFERD\n 40\n0.0\n  9\n$SKPOLY\n 70\n0\n  9\n$TDCREATE\n 40\n2461334.105960648\n  9\n$TDUCREATE\n 40\n2458532.153996898\n  9\n$TDUPDATE\n 40\n2461334.105960648\n  9\n$TDUUPDATE\n 40\n2458532.1544311\n  9\n$TDINDWG\n 40\n0.0\n  9\n$TDUSRTIMER\n 40\n0.0\n  9\n$USRTIMER\n 70\n1\n  9\n$ANGBASE\n 50\n0.0\n  9\n$ANGDIR\n 70\n0\n  9\n$PDMODE\n 70\n0\n  9\n$PDSIZE\n 40\n0.0\n  9\n$PLINEWID\n 40\n0.0\n  9\n$SPLFRAME\n 70\n0\n  9\n$SPLINETYPE\n 70\n6\n  9\n$SPLINESEGS\n 70\n8\n  9\n$HANDSEED\n  5\n100\n  9\n$SURFTAB1\n 70\n6\n  9\n$SURFTAB2\n 70\n6\n  9\n$SURFTYPE\n 70\n6\n  9\n$SURFU\n 70\n6\n  9\n$SURFV\n 70\n6\n  9\n$UCSBASE\n  2\n\n  9\n$UCSNAME\n  2\n\n  9\n$UCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$UCSORTHOREF\n  2\n\n  9\n$UCSORTHOVIEW\n 70\n0\n  9\n$UCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$UCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSBASE\n  2\n\n  9\n$PUCSNAME\n  2\n\n  9\n$PUCSORG\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSXDIR\n 10\n1.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSYDIR\n 10\n0.0\n 20\n1.0\n 30\n0.0\n  9\n$PUCSORTHOREF\n  2\n\n  9\n$PUCSORTHOVIEW\n 70\n0\n  9\n$PUCSORGTOP\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBOTTOM\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGLEFT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGRIGHT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGFRONT\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PUCSORGBACK\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$USERI1\n 70\n0\n  9\n$USERI2\n 70\n0\n  9\n$USERI3\n 70\n0\n  9\n$USERI4\n 70\n0\n  9\n$USERI5\n 70\n0\n  9\n$USERR1\n 40\n0.0\n  9\n$USERR2\n 40\n0.0\n  9\n$USERR3\n 40\n0.0\n  9\n$USERR4\n 40\n0.0\n  9\n$USERR5\n 40\n0.0\n  9\n$WORLDVIEW\n 70\n1\n  9\n$SHADEDGE\n 70\n3\n  9\n$SHADEDIF\n 70\n70\n  9\n$TILEMODE\n 70\n1\n  9\n$MAXACTVP\n 70\n64\n  9\n$PINSBASE\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  9\n$PLIMCHECK\n 70\n0\n  9\n$PEXTMIN\n 10\n1e+20\n 20\n1e+20\n 30\n1e+20\n  9\n$PEXTMAX\n 10\n-1e+20\n 20\n-1e+20\n 30\n-1e+20\n  9\n$PLIMMIN\n 10\n0.0\n 20\n0.0\n  9\n$PLIMMAX\n 10\n420.0\n 20\n297.0\n  9\n$UNITMODE\n 70\n0\n  9\n$VISRETAIN\n 70\n1\n  9\n$PLINEGEN\n 70\n0\n  9\n$PSLTSCALE\n 70\n1\n  9\n$TREEDEPTH\n 70\n3020\n  9\n$CMLSTYLE\n  2\nStandard\n  9\n$CMLJUST\n 70\n0\n  9\n$CMLSCALE\n 40\n20.0\n  9\n$PROXYGRAPHICS\n 70\n1\n  9\n$MEASUREMENT\n 70\n1\n  9\n$CELWEIGHT\n370\n-1\n  9\n$ENDCAPS\n280\n0\n  9\n$JOINSTYLE\n280\n0\n  9\n$LWDISPLAY\n290\n0\n  9\n$INSUNITS\n 70\n6\n  9\n$HYPERLINKBASE\n  1\n\n  9\n$STYLESHEET\n  1\n\n  9\n$XEDIT\n290\n1\n  9\n$CEPSNTYPE\n380\n0\n  9\n$PSTYLEMODE\n290\n1\n  9\n$FINGERPRINTGUID\n  2\n{9F30E6C9-6BF8-4440-9801-552B42389842}\n  9\n$VERSIONGUID\n  2\n{92059398-5C23-4D84-B49E-B3A1804681FB}\n  9\n$EXTNAMES\n290\n1\n  9\n$PSVPSCALE\n 40\n0.0\n  9\n$OLESTARTUP\n290\n0\n  9\n$SORTENTS\n280\n127\n  9\n$INDEXCTL\n280\n0\n  9\n$HIDETEXT\n280\n1\n  9\n$XCLIPFRAME\n280\n1\n  9\n$HALOGAP\n280\n0\n  9\n$OBSCOLOR\n 70\n257\n  9\n$OBSLTYPE\n280\n0\n  9\n$INTERSECTIONDISPLAY\n280\n0\n  9\n$INTERSECTIONCOLOR\n 70\n257\n  9\n$DIMASSOC\n280\n2\n  9\n$PROJECTNAME\n  1\n\n  9\n$CAMERADISPLAY\n290\n0\n  9\n$LENSLENGTH\n 40\n50.0\n  9\n$CAMERAHEIGHT\n 40\n0.0\n  9\n$STEPSPERSEC\n 40\n24.0\n  9\n$STEPSIZE\n 40\n100.0\n  9\n$3DDWFPREC\n 40\n2.0\n  9\n$PSOLWIDTH\n 40\n0.005\n  9\n$PSOLHEIGHT\n 40\n0.08\n  9\n$LOFTANG1\n 40\n1.570796326795\n  9\n$LOFTANG2\n 40\n1.570796326795\n  9\n$LOFTMAG1\n 40\n0.0\n  9\n$LOFTMAG2\n 40\n0.0\n  9\n$LOFTPARAM\n 70\n7\n  9\n$LOFTNORMALS\n280\n1\n  9\n$LATITUDE\n 40\n37.795\n  9\n$LONGITUDE\n 40\n-122.394\n  9\n$NORTHDIRECTION\n 40\n0.0\n  9\n$TIMEZONE\n 70\n-8000\n  9\n$LIGHTGLYPHDISPLAY\n280\n1\n  9\n$TILEMODELIGHTSYNCH\n280\n1\n  9\n$CMATERIAL\n347\n20\n  9\n$SOLIDHIST\n280\n0\n  9\n$SHOWHIST\n280\n1\n  9\n$DWFFRAME\n280\n2\n  9\n$DGNFRAME\n280\n2\n  9\n$REALWORLDSCALE\n290\n1\n  9\n$INTERFERECOLOR\n 62\n256\n  9\n$CSHADOW\n280\n0\n  9\n$SHADOWPLANELOCATION\n 40\n0.0\n  0\nENDSEC\n  0\nSECTION\n  2\nCLASSES\n  0\nCLASS\n  1\nACDBDICTIONARYWDFLT\n  2\nAcDbDictionaryWithDefault\n  3\nObjectDBX Classes\n 90\n0\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nSUN\n  2\nAcDbSun\n  3\nSCENEOE\n 90\n1153\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nVISUALSTYLE\n  2\nAcDbVisualStyle\n  3\nObjectDBX Classes\n 90\n4095\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nMATERIAL\n  2\nAcDbMaterial\n  3\nObjectDBX Classes\n 90\n1153\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nSCALE\n  2\nAcDbScale\n  3\nObjectDBX Classes\n 90\n1153\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nTABLESTYLE\n  2\nAcDbTableStyle\n  3\nObjectDBX Classes\n 90\n4095\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nMLEADERSTYLE\n  2\nAcDbMLeaderStyle\n  3\nACDB_MLEADERSTYLE_CLASS\n 90\n4095\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nDICTIONARYVAR\n  2\nAcDbDictionaryVar\n  3\nObjectDBX Classes\n 90\n0\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nCELLSTYLEMAP\n  2\nAcDbCellStyleMap\n  3\nObjectDBX Classes\n 90\n1152\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nMENTALRAYRENDERSETTINGS\n  2\nAcDbMentalRayRenderSettings\n  3\nSCENEOE\n 90\n1024\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBDETAILVIEWSTYLE\n  2\nAcDbDetailViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBSECTIONVIEWSTYLE\n  2\nAcDbSectionViewStyle\n  3\nObjectDBX Classes\n 90\n1025\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nRASTERVARIABLES\n  2\nAcDbRasterVariables\n  3\nISM\n 90\n0\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nACDBPLACEHOLDER\n  2\nAcDbPlaceHolder\n  3\nObjectDBX Classes\n 90\n0\n 91\n0\n280\n0\n281\n0\n  0\nCLASS\n  1\nLAYOUT\n  2\nAcDbLayout\n  3\nObjectDBX Classes\n 90\n0\n 91\n0\n280\n0\n281\n0\n  0\nENDSEC\n  0\nSECTION\n  2\nTABLES\n  0\nTABLE\n  2\nVPORT\n  5\n8\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n  0\nVPORT\n  5\n23\n330\n8\n100\nAcDbSymbolTableRecord\n100\nAcDbViewportTableRecord\n  2\n*Active\n 70\n0\n 10\n0.0\n 20\n0.0\n 11\n1.0\n 21\n1.0\n 12\n0.0\n 22\n0.0\n 13\n0.0\n 23\n0.0\n 14\n0.5\n 24\n0.5\n 15\n0.5\n 25\n0.5\n 16\n0.0\n 26\n0.0\n 36\n1.0\n 17\n0.0\n 27\n0.0\n 37\n0.0\n 40\n1000.0\n 41\n1.34\n 42\n50.0\n 43\n0.0\n 44\n0.0\n 50\n0.0\n 51\n0.0\n 71\n0\n 72\n1000\n 73\n1\n 74\n3\n 75\n0\n 76\n0\n 77\n0\n 78\n0\n281\n0\n 65\n0\n146\n0.0\n  0\nENDTAB\n  0\nTABLE\n  2\nLTYPE\n  5\n2\n330\n0\n100\nAcDbSymbolTable\n 70\n4\n  0\nLTYPE\n  5\n24\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByBlock\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n25\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nByLayer\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n26\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nContinuous\n 70\n0\n  3\n\n 72\n65\n 73\n0\n 40\n0.0\n  0\nLTYPE\n  5\n4F\n330\n2\n100\nAcDbSymbolTableRecord\n100\nAcDbLinetypeTableRecord\n  2\nDASHED\n 70\n0\n  3\n\n 72\n65\n 73\n2\n 40\n1.2\n 49\n0.8\n 74\n0\n 49\n-0.4\n 74\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nLAYER\n  5\n1\n330\n0\n100\nAcDbSymbolTable\n 70\n34\n  0\nLAYER\n  5\n27\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\n0\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n28\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDefpoints\n 70\n0\n 62\n7\n  6\nContinuous\n290\n0\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n2F\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPST_KAEK\n 70\n0\n 62\n16\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n30\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKYROSH\n 70\n0\n 62\n2\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n31\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nBOUND_UNIMPL\n 70\n0\n 62\n61\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n32\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nVST\n 70\n0\n 62\n233\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n33\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEAS\n 70\n0\n 62\n233\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n34\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDBOUND_FOR\n 70\n0\n 62\n94\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n35\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nTOPO_PROP\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n36\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nVST_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n37\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEAS_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n38\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nDGM_PROP_FINAL\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n39\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_D\n 70\n0\n 62\n4\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3A\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_A\n 70\n0\n 62\n6\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3B\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEI_PNT\n 70\n0\n 62\n152\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3C\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nLINE_XM_VST\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3D\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nFOREST_FINAL\n 70\n0\n 62\n14\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3E\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKORYFES\n 70\n0\n 62\n80\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n3F\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nEIA\n 70\n0\n 62\n152\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n40\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_EKTOS_KAEK\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n41\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nBOUND_IMPL\n 70\n0\n 62\n42\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n42\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_D-labels\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n43\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_A-labels\n 70\n0\n 62\n3\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n44\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_D-hatch\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n45\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_A-hatch\n 70\n0\n 62\n3\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n46\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_EKTOS_KAEK-labels\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n47\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAREA_EKTOS_KAEK-hatch\n 70\n0\n 62\n30\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n48\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nSHMEIA_TOPO_PROP\n 70\n0\n 62\n5\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n49\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nSHMEIA_PST_KAEK\n 70\n0\n 62\n1\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n4A\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nIDIOKTHTES\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n4B\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nKANNABOS\n 70\n0\n 62\n8\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n4C\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nAPOSTASEIS\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n4D\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPINAKES\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nLAYER\n  5\n4E\n330\n1\n100\nAcDbSymbolTableRecord\n100\nAcDbLayerTableRecord\n  2\nPINAKIDA\n 70\n0\n 62\n7\n  6\nContinuous\n370\n-3\n390\n13\n347\n21\n  0\nENDTAB\n  0\nTABLE\n  2\nSTYLE\n  5\n5\n330\n0\n100\nAcDbSymbolTable\n 70\n2\n  0\nSTYLE\n  5\n29\n330\n5\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n  2\nStandard\n 70\n0\n 40\n0.0\n 41\n1.0\n 50\n0.0\n 71\n0\n 42\n2.5\n  3\narial.ttf\n  4\n\n  0\nSTYLE\n  5\n50\n330\n5\n100\nAcDbSymbolTableRecord\n100\nAcDbTextStyleTableRecord\n  2\nArial\n 70\n0\n 40\n0.0\n 41\n1.0\n 50\n0.0\n 71\n0\n 42\n2.5\n  3\narial.ttf\n  4\n\n  0\nENDTAB\n  0\nTABLE\n  2\nVIEW\n  5\n7\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nUCS\n  5\n6\n330\n0\n100\nAcDbSymbolTable\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nAPPID\n  5\n3\n330\n0\n100\nAcDbSymbolTable\n 70\n3\n  0\nAPPID\n  5\n2A\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nACAD\n 70\n0\n  0\nAPPID\n  5\n51\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nHATCHBACKGROUNDCOLOR\n 70\n0\n  0\nAPPID\n  5\n52\n330\n3\n100\nAcDbSymbolTableRecord\n100\nAcDbRegAppTableRecord\n  2\nEZDXF\n 70\n0\n  0\nENDTAB\n  0\nTABLE\n  2\nDIMSTYLE\n  5\n4\n330\n0\n100\nAcDbSymbolTable\n 70\n1\n100\nAcDbDimStyleTable\n  0\nDIMSTYLE\n105\n2B\n330\n4\n100\nAcDbSymbolTableRecord\n100\nAcDbDimStyleTableRecord\n  2\nStandard\n 70\n0\n 40\n1.0\n 41\n2.5\n 42\n0.625\n 43\n3.75\n 44\n1.25\n 45\n0.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n2.5\n140\n2.5\n141\n2.5\n142\n0.0\n143\n0.03937007874\n144\n1.0\n145\n0.0\n146\n1.0\n147\n0.625\n148\n0.0\n 69\n0\n 70\n0\n 71\n0\n 72\n0\n 73\n0\n 74\n0\n 75\n0\n 76\n0\n 77\n1\n 78\n8\n 79\n3\n170\n0\n171\n3\n172\n1\n173\n0\n174\n0\n175\n0\n176\n0\n177\n0\n178\n0\n179\n2\n271\n2\n272\n2\n273\n2\n274\n3\n275\n0\n276\n0\n277\n2\n278\n44\n279\n0\n280\n0\n281\n0\n282\n0\n283\n0\n284\n8\n285\n0\n286\n0\n288\n0\n289\n3\n290\n0\n371\n-2\n372\n-2\n  0\nENDTAB\n  0\nTABLE\n  2\nBLOCK_RECORD\n  5\n9\n330\n0\n100\nAcDbSymbolTable\n 70\n2\n  0\nBLOCK_RECORD\n  5\n17\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Model_Space\n340\n1A\n 70\n0\n280\n1\n281\n0\n  0\nBLOCK_RECORD\n  5\n1B\n330\n9\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n*Paper_Space\n340\n1E\n 70\n0\n280\n1\n281\n0\n  0\nENDTAB\n  0\nENDSEC\n  0\nSECTION\n  2\nBLOCKS\n  0\nBLOCK\n  5\n18\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Model_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Model_Space\n  1\n\n  0\nENDBLK\n  5\n19\n330\n17\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nBLOCK\n  5\n1C\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockBegin\n  2\n*Paper_Space\n 70\n0\n 10\n0.0\n 20\n0.0\n 30\n0.0\n  3\n*Paper_Space\n  1\n\n  0\nENDBLK\n  5\n1D\n330\n1B\n100\nAcDbEntity\n  8\n0\n100\nAcDbBlockEnd\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nSECTION\n  2\nOBJECTS\n  0\nDICTIONARY\n  5\nA\n330\n0\n100\nAcDbDictionary\n281\n1\n  3\nACAD_COLOR\n350\nB\n  3\nACAD_GROUP\n350\nC\n  3\nACAD_LAYOUT\n350\nD\n  3\nACAD_MATERIAL\n350\nE\n  3\nACAD_MLEADERSTYLE\n350\nF\n  3\nACAD_MLINESTYLE\n350\n10\n  3\nACAD_PLOTSETTINGS\n350\n11\n  3\nACAD_PLOTSTYLENAME\n350\n12\n  3\nACAD_SCALELIST\n350\n14\n  3\nACAD_TABLESTYLE\n350\n15\n  3\nACAD_VISUALSTYLE\n350\n16\n  3\nEZDXF_META\n350\n2D\n  0\nDICTIONARY\n  5\nB\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nC\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\nD\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nModel\n350\n1A\n  3\nLayout1\n350\n1E\n  0\nDICTIONARY\n  5\nE\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nByBlock\n350\n1F\n  3\nByLayer\n350\n20\n  3\nGlobal\n350\n21\n  0\nDICTIONARY\n  5\nF\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n2C\n  0\nDICTIONARY\n  5\n10\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n22\n  0\nDICTIONARY\n  5\n11\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nACDBDICTIONARYWDFLT\n  5\n12\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nNormal\n350\n13\n100\nAcDbDictionaryWithDefault\n340\n13\n  0\nACDBPLACEHOLDER\n  5\n13\n330\n12\n  0\nDICTIONARY\n  5\n14\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nDICTIONARY\n  5\n15\n330\nA\n100\nAcDbDictionary\n281\n1\n  3\nStandard\n350\n60\n  0\nDICTIONARY\n  5\n16\n330\nA\n100\nAcDbDictionary\n281\n1\n  0\nLAYOUT\n  5\n1A\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n1024\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nModel\n 70\n1\n 71\n0\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n17\n  0\nLAYOUT\n  5\n1E\n330\nD\n100\nAcDbPlotSettings\n  1\n\n  4\nA3\n  6\n\n 40\n7.5\n 41\n20.0\n 42\n7.5\n 43\n20.0\n 44\n420.0\n 45\n297.0\n 46\n0.0\n 47\n0.0\n 48\n0.0\n 49\n0.0\n140\n0.0\n141\n0.0\n142\n1.0\n143\n1.0\n 70\n0\n 72\n1\n 73\n0\n 74\n5\n  7\n\n 75\n16\n 76\n0\n 77\n2\n 78\n300\n147\n1.0\n148\n0.0\n149\n0.0\n100\nAcDbLayout\n  1\nLayout1\n 70\n1\n 71\n1\n 10\n0.0\n 20\n0.0\n 11\n420.0\n 21\n297.0\n 12\n0.0\n 22\n0.0\n 32\n0.0\n 14\n1e+20\n 24\n1e+20\n 34\n1e+20\n 15\n-1e+20\n 25\n-1e+20\n 35\n-1e+20\n146\n0.0\n 13\n0.0\n 23\n0.0\n 33\n0.0\n 16\n1.0\n 26\n0.0\n 36\n0.0\n 17\n0.0\n 27\n1.0\n 37\n0.0\n 76\n1\n330\n1B\n  0\nMATERIAL\n  5\n1F\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByBlock\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n20\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nByLayer\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMATERIAL\n  5\n21\n102\n{ACAD_REACTORS\n330\nE\n102\n}\n330\nE\n100\nAcDbMaterial\n  1\nGlobal\n  2\n\n 70\n0\n 40\n1.0\n 71\n1\n 41\n1.0\n 91\n-1023410177\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 44\n0.5\n 73\n0\n 45\n1.0\n 46\n1.0\n 77\n1\n  4\n\n 78\n1\n 79\n1\n170\n1\n 48\n1.0\n171\n1\n  6\n\n172\n1\n173\n1\n174\n1\n140\n1.0\n141\n1.0\n175\n1\n  7\n\n176\n1\n177\n1\n178\n1\n143\n1.0\n179\n1\n  8\n\n270\n1\n271\n1\n272\n1\n145\n1.0\n146\n1.0\n273\n1\n  9\n\n274\n1\n275\n1\n276\n1\n 42\n1.0\n 72\n1\n  3\n\n 73\n1\n 74\n1\n 75\n1\n 94\n63\n  0\nMLINESTYLE\n  5\n22\n102\n{ACAD_REACTORS\n330\n10\n102\n}\n330\n10\n100\nAcDbMlineStyle\n  2\nStandard\n 70\n0\n  3\n\n 62\n256\n 51\n90.0\n 52\n90.0\n 71\n2\n 49\n0.5\n 62\n256\n  6\nBYLAYER\n 49\n-0.5\n 62\n256\n  6\nBYLAYER\n  0\nMLEADERSTYLE\n  5\n2C\n102\n{ACAD_REACTORS\n330\nF\n102\n}\n330\nF\n100\nAcDbMLeaderStyle\n179\n2\n170\n2\n171\n1\n172\n0\n 90\n2\n 40\n0.0\n 41\n0.0\n173\n1\n 91\n-1056964608\n 92\n-2\n290\n1\n 42\n2.0\n291\n1\n 43\n8.0\n  3\nStandard\n 44\n4.0\n300\n\n342\n29\n174\n1\n175\n1\n176\n0\n178\n1\n 93\n-1056964608\n 45\n4.0\n292\n0\n297\n0\n 46\n4.0\n 94\n-1056964608\n 47\n1.0\n 49\n1.0\n140\n1.0\n294\n1\n141\n0.0\n177\n0\n142\n1.0\n295\n0\n296\n0\n143\n3.75\n271\n0\n272\n9\n273\n9\n  0\nDICTIONARY\n  5\n2D\n330\nA\n100\nAcDbDictionary\n280\n1\n281\n1\n  3\nCREATED_BY_EZDXF\n350\n2E\n  3\nWRITTEN_BY_EZDXF\n350\n53\n  0\nDICTIONARYVAR\n  5\n2E\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-10-19T23:32:35.186560+00:00\n  0\nDICTIONARYVAR\n  5\n53\n330\n2D\n100\nDictionaryVariables\n280\n0\n  1\n1.4.5 @ 2026-10-19T23:32:35.188029+00:00\n  0\nTABLESTYLE\n  5\n60\n330\n15\n100\nAcDbTableStyle\n  3\nStandard\n 70\n0\n 71\n0\n 40\n0.06\n 41\n0.06\n280\n0\n281\n0\n  7\nStandard\n140\n0.18\n170\n2\n 62\n0\n 63\n257\n283\n0\n 90\n512\n 91\n0\n  1\n\n274\n-2\n284\n1\n 64\n0\n275\n-2\n285\n1\n 65\n0\n276\n-2\n286\n1\n 66\n0\n277\n-2\n287\n1\n 67\n0\n278\n-2\n288\n1\n 68\n0\n279\n-2\n289\n1\n 69\n0\n  7\nStandard\n140\n0.25\n170\n5\n 62\n0\n 63\n257\n283\n0\n 90\n512\n 91\n0\n  1\n\n274\n-2\n284\n1\n 64\n0\n275\n-2\n285\n1\n 65\n0\n276\n-2\n286\n1\n 66\n0\n277\n-2\n287\n1\n 67\n0\n278\n-2\n288\n1\n 68\n0\n279\n-2\n289\n1\n 69\n0\n  7\nStandard\n140\n0.18\n170\n5\n 62\n0\n 63\n257\n283\n0\n 90\n512\n 91\n0\n  1\n\n274\n-2\n284\n1\n 64\n0\n275\n-2\n285\n1\n 65\n0\n276\n-2\n286\n1\n 66\n0\n277\n-2\n287\n1\n 67\n0\n278\n-2\n288\n1\n 68\n0\n279\n-2\n289\n1\n 69\n0\n  0\nENDSEC\n  0\nEOF\n"; // R2018 (UTF-8) για DXF εκτύπωσης με native TABLE
  var ESC = true; // \U+XXXX για μη-ASCII (R2000)· στο R2018 γράφεται UTF-8 απευθείας

  function f(v) { return (Math.round(v * 1000) / 1000).toFixed(3); }
  // Κείμενο DXF: οι μη-ASCII χαρακτήρες (ελληνικά, °, ² κ.λπ.) γράφονται ως \U+XXXX — διαβάζεται σωστά σε κάθε CAD,
  // ανεξάρτητα από την κωδικοσελίδα του συστήματος (τα R2000 αρχεία δεν είναι Unicode).
  function uesc(s) { if (!ESC) return String(s); return String(s).replace(/[^\x00-\x7F]/g, function (c) { var h = c.charCodeAt(0).toString(16).toUpperCase(); return '\\U+' + ('0000' + h).slice(-4); }); }
  function clean(s) { return uesc(String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').slice(0, 250)); }
  // κείμενο κελιού πίνακα: οι αλλαγές γραμμής του PDF γίνονται \P, ώστε το CAD να το στοιχίζει όπως το PDF
  function cleanML(s) { return uesc(String(s == null ? '' : s).slice(0, 250).replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\P')); }

  function mtxt(t) { return uesc(String(t == null ? '' : t).replace(/[\r\n]+/g, ' ').slice(0, 250).replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}')); }
  // πολυγραμμικό MTEXT: διατηρεί αλλαγές γραμμής ως \P, χωρίς περικοπή (η τεμαχισμός σε ομάδες 3/1 γίνεται στον emitter)
  function mtxtML(t) { return uesc(String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\r?\n/g, '\\P')); }

  // Πίνακας layers του προτύπου: κρατά τα χρησιμοποιούμενα (και 0/Defpoints), προσθέτει όσα λείπουν με χρώμα από defs
  function rewriteLayers(tpl, used, defs, next, prune) {
    var start = tpl.indexOf('\n  0\nTABLE\n  2\nLAYER\n'); if (start < 0) return tpl;
    var end = tpl.indexOf('\n  0\nENDTAB\n', start); if (end < 0) return tpl;
    var block = tpl.slice(start + 1, end + 1); // από "  0\nTABLE..." έως πριν το "  0\nENDTAB"
    var parts = block.split('\n  0\nLAYER\n');
    var head = parts[0] + '\n', entries = parts.slice(1);
    var th = /\n  5\n([0-9A-Fa-f]+)\n/.exec('\n' + head); var tableHandle = th ? th[1] : '1';
    var have = {}, keep = [];
    entries.forEach(function (e) {
      var m = /\n  2\n([^\n]*)\n/.exec('\n' + e); var name = m ? m[1] : '';
      have[name] = 1;
      if (!prune || name === '0' || name === 'Defpoints' || used[name]) keep.push(e);
    });
    Object.keys(used).forEach(function (name) {
      if (have[name]) return;
      var d = defs[name] || {};
      keep.push(['  5', next(), '330', tableHandle, '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord', '  2', name, ' 70', '0', ' 62', String(d.color || 7), '  6', d.ltype || 'Continuous', '370', '-3', '390', '13'].join('\n') + '\n');
    });
    head = head.replace(/\n 70\n\d+\n/, '\n 70\n' + keep.length + '\n');
    var out = head + keep.map(function (e) { return '  0\nLAYER\n' + e + (/\n$/.test(e) ? '' : '\n'); }).join('');
    if (!/\n$/.test(out)) out += '\n';
    return tpl.slice(0, start + 1) + out + tpl.slice(end + 1);
  }

  // Στυλ κειμένου Arial (TrueType) στον πίνακα STYLE του προτύπου
  function ensureStyle(tpl, name, next) {
    if (new RegExp('\\nAcDbTextStyleTableRecord\\n  2\\n' + name + '\\n').test(tpl)) return tpl;
    var start = tpl.indexOf('\n  0\nTABLE\n  2\nSTYLE\n'); if (start < 0) return tpl;
    var end = tpl.indexOf('\n  0\nENDTAB\n', start); if (end < 0) return tpl;
    var block = tpl.slice(start + 1, end + 1);
    var th = /\n  5\n([0-9A-Fa-f]+)\n/.exec('\n' + block); var tableHandle = th ? th[1] : '5';
    var cnt = (block.match(/\n  0\nSTYLE\n/g) || []).length + 1;
    block = block.replace(/\n 70\n\d+\n/, '\n 70\n' + cnt + '\n');
    var entry = ['  0', 'STYLE', '  5', next(), '330', tableHandle, '100', 'AcDbSymbolTableRecord', '100', 'AcDbTextStyleTableRecord', '  2', name, ' 70', '0', ' 40', '0.0', ' 41', '1.0', ' 50', '0.0', ' 71', '0', ' 42', '2.5', '  3', name.toLowerCase() + '.ttf', '  4', '', '1001', 'ACAD', '1000', name, '1071', '34'].join('\n') + '\n';
    return tpl.slice(0, start + 1) + block + entry + tpl.slice(end + 1);
  }
  var FONT = 'Arial';

  // spec: { polys:[{layer, pts:[[x,y]...], bulges?, closed, color?, lw?}], texts:[{layer,x,y,text,h,rot,align,color}],
  //         mtexts:[{layer,x,y,text,h,rot,color}], lines:[{layer,a,b,color}], points:[{layer,x,y,xs?,ys?}], layers:{name:{color,ltype}} }
  // opts: { prune: αφαίρεση αχρησιμοποίητων layers του προτύπου, insunits }
  function build(spec, opts) {
    opts = opts || {};
    var is2018 = opts.template === '2018';
    ESC = !is2018;
    var tpl = is2018 ? TEMPLATE2018 : TEMPLATE;
    // έκδοση AC1027 (2013): ίδια δομή με το 2018, αλλά ανοίγει και σε παλαιότερα CAD της αγοράς (2013 και νεότερα)
    if (is2018) tpl = tpl.replace('$ACADVER\n  1\nAC1032', '$ACADVER\n  1\nAC1027').replace('$ACADMAINTVER\n 90\n4', '$ACADMAINTVER\n 70\n105');
    var owner = is2018 ? ((/\n  0\nBLOCK_RECORD\n  5\n([0-9A-Fa-f]+)\n330\n[0-9A-Fa-f]+\n100\nAcDbSymbolTableRecord\n100\nAcDbBlockTableRecord\n  2\n\*Model_Space\n/.exec(tpl) || [])[1] || '17') : MSP_OWNER;
    var hs = /\$HANDSEED\r?\n\s*5\r?\n([0-9A-Fa-f]+)/.exec(tpl);
    var seed = hs ? parseInt(hs[1], 16) : 0x100;
    var next = function () { return (seed++).toString(16).toUpperCase(); };
    var out = [], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, used = {};
    function ext(x, y) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    function U(l) { used[l] = 1; return l; }
    (spec.polys || []).forEach(function (p) {
      var pts = p.pts.slice(), bul = p.bulges ? p.bulges.slice() : null;
      if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) { pts.pop(); if (bul) bul.pop(); }
      if (pts.length < 2) return;
      out.push('0', 'LWPOLYLINE', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(p.layer));
      if (p.color) out.push('62', String(p.color));
      if (p.lw != null) out.push('370', String(p.lw));
      out.push('100', 'AcDbPolyline', '90', String(pts.length), '70', p.closed ? '1' : '0', '43', '0.0');
      pts.forEach(function (q, i) { out.push('10', f(q[0]), '20', f(q[1])); if (bul && bul[i]) out.push('42', (Math.round(bul[i] * 1e9) / 1e9).toString()); ext(q[0], q[1]); });
    });
    var arialW = function (t) { var w = 0; t = String(t || ''); for (var i = 0; i < t.length; i++) { var c = t[i]; w += /[0-9]/.test(c) ? 0.556 : /[\s.,:;'|!ιίϊΐ]/.test(c) ? 0.278 : /[-()\/]/.test(c) ? 0.333 : /[ΜΩWMmw]/.test(c) ? 0.833 : c === c.toUpperCase() && c !== c.toLowerCase() ? 0.667 : 0.52; } return w; };
    (spec.texts || []).forEach(function (t) {
      var h = t.h || 0.5;
      out.push('0', 'TEXT', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(t.layer));
      if (t.color) out.push('62', String(t.color));
      // κεντραρισμένο / δεξιά: το 10/20 είναι η ΑΡΧΗ του κειμένου (υπολογισμένη από το πλάτος Arial) και το 11/21 το σημείο στοίχισης —
      // έτσι το κείμενο κάθεται σωστά και σε CAD που δεν ξαναϋπολογίζουν τη θέση (ProgeCAD, IntelliCAD κ.ά.), όχι μετατοπισμένο δεξιά
      var x10 = t.x, y10 = t.y;
      if (t.align === 'center' || t.align === 'right') { var tw0 = arialW(String(t.text == null ? "" : t.text).replace(/\\[A-Za-z][^;]*;/g, "")) * h * (t.align === 'center' ? 0.5 : 1), ra = (t.rot || 0) * Math.PI / 180; x10 = t.x - tw0 * Math.cos(ra); y10 = t.y - tw0 * Math.sin(ra); }
      out.push('100', 'AcDbText', '10', f(x10), '20', f(y10), '30', '0.0', '40', f(h), '1', clean(t.text));
      if (t.rot) out.push('50', f(t.rot));
      out.push('7', FONT);
      if (t.align === 'center' || t.align === 'right') out.push('72', t.align === 'center' ? '1' : '2', '11', f(t.x), '21', f(t.y), '31', '0.0');
      else if (t.align === 'fit' && t.fit) out.push('72', '5', '11', f(t.fit[0]), '21', f(t.fit[1]), '31', '0.0'); // Fit: συμπίεση πλάτους ανάμεσα στα δύο σημεία
      out.push('100', 'AcDbText');
      ext(t.x, t.y);
    });
    (spec.mtexts || []).forEach(function (t) {
      var h = t.h || 0.5, r = (t.rot || 0) * Math.PI / 180;
      var attach = t.attach || 7, ml = !!t.multiline;
      // σημείο εισαγωγής: κάτω-αριστερά (7) — η βάση γραμμής του PDF είναι ~0,25h πάνω από το κάτω όριο του πλαισίου· πάνω-αριστερά (1) → χωρίς offset
      var x = attach === 1 ? t.x : t.x + Math.sin(r) * 0.25 * h, y = attach === 1 ? t.y : t.y - Math.cos(r) * 0.25 * h;
      out.push('0', 'MTEXT', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(t.layer));
      if (t.color) out.push('62', String(t.color));
      out.push('100', 'AcDbMText', '10', f(x), '20', f(y), '30', '0.0', '40', f(h), '41', f(t.width || 0), '71', String(attach), '72', '1');
      if (t.lineH) out.push('73', '2', '44', (t.lineH / (h * 5 / 3)).toFixed(4)); // διάστιχο «ακριβώς», όπως υπολογίστηκε η ζώνη
      var esc = ml ? mtxtML(t.text) : mtxt(t.text);
      // τεμαχισμός σε ομάδες 3 (ανά 250 χαρ.) + τελική ομάδα 1, ώστε να μην ξεπερνιέται το όριο γραμμής DXF
      while (esc.length > 250) { out.push('3', esc.slice(0, 250)); esc = esc.slice(250); }
      out.push('1', esc, '7', FONT, '11', (Math.round(Math.cos(r) * 1e9) / 1e9).toString(), '21', (Math.round(Math.sin(r) * 1e9) / 1e9).toString(), '31', '0.0');
      ext(t.x, t.y);
    });
    (spec.hatches || []).forEach(function (h) { // γέμισμα: SOLID ή διαγράμμιση (pattern διαγώνιων γραμμών)
      var pts = h.pts.slice(); if (pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      if (pts.length < 3) return;
      out.push('0', 'HATCH', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(h.layer));
      if (h.color) out.push('62', String(h.color));
      if (h.transparency) out.push('440', String(0x02000000 + Math.max(0, Math.min(255, Math.round(255 * (1 - h.transparency / 100)))))); // ημιδιαφάνεια
      var solid = !h.pattern;
      out.push('100', 'AcDbHatch', '10', '0.0', '20', '0.0', '30', '0.0', '210', '0.0', '220', '0.0', '230', '1.0', '2', solid ? 'SOLID' : 'ANSI31', '70', solid ? '1' : '0', '71', '0', '91', '1', '92', '3', '72', '0', '73', '1', '93', String(pts.length));
      pts.forEach(function (q) { out.push('10', f(q[0]), '20', f(q[1])); ext(q[0], q[1]); });
      out.push('97', '0');
      if (solid) { out.push('75', '0', '76', '1', '98', '0'); }
      else {
        // pattern διαγώνιων γραμμών: γωνία h.angle, απόσταση h.spacing (μονάδες μοντέλου).
        // ANSI31 = γραμμές 45° ανά 3,175: η «γωνία» (52) είναι η στροφή ΠΑΝΩ από τις 45° και η «κλίμακα» (41) = απόσταση/3,175 — όπως τα γράφουν τα CAD,
        // ώστε και όσα CAD ξαναφτιάχνουν το μοτίβο από το όνομα ANSI31 να δείχνουν ίδιες γραμμές.
        var ang = (h.angle != null ? h.angle : 45) * Math.PI / 180, D = h.spacing || 1.0;
        var ox2 = -Math.sin(ang) * D, oy2 = Math.cos(ang) * D; // μετατόπιση κάθετη στη γραμμή
        out.push('75', '1', '76', '1', '52', f(((h.angle != null ? h.angle : 45) - 45 + 360) % 360), '41', f(D / 3.175), '77', '0', '78', '1',
          '53', f((h.angle != null ? h.angle : 45)), '43', '0.0', '44', '0.0', '45', f(ox2), '46', f(oy2), '79', '0', '98', '0');
      }
    });
    (spec.lines || []).forEach(function (l) {
      out.push('0', 'LINE', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(l.layer));
      if (l.color) out.push('62', String(l.color));
      out.push('100', 'AcDbLine', '10', f(l.a[0]), '20', f(l.a[1]), '30', '0.0', '11', f(l.b[0]), '21', f(l.b[1]), '31', '0.0');
      ext(l.a[0], l.a[1]); ext(l.b[0], l.b[1]);
    });
    (spec.points || []).forEach(function (p) {
      out.push('0', 'POINT', '5', next(), '330', owner, '100', 'AcDbEntity', '8', U(p.layer), '100', 'AcDbPoint', '10', p.xs || f(p.x), '20', p.ys || f(p.y), '30', '0.0');
      ext(p.x, p.y);
    });
    // ---- native πίνακες (ACAD_TABLE) — μόνο στο R2018 πρότυπο· δομή όπως σε αρχεία AutoCAD που έχουν γίνει δεκτά ----
    var blkRecs = [], blocks = [];
    if (is2018 && spec.tables && spec.tables.length) {
      var tsH = ((/\n  0\nTABLESTYLE\n  5\n([0-9A-Fa-f]+)\n/.exec(tpl) || [])[1]) || '60';
      var brTableH = (function () { var i = tpl.indexOf('\n  0\nTABLE\n  2\nBLOCK_RECORD\n'); var m = /\n  5\n([0-9A-Fa-f]+)\n/.exec(tpl.slice(i, i + 60)); return m ? m[1] : '9'; })();
      spec.tables.forEach(function (t, ti) {
        var name = '*T' + (ti + 1), brH = next(), tblH = next();
        var hasTitle = !!t.title, cols = t.colW.length;
        var rowsH = []; if (hasTitle) rowsH.push(t.titleH); rowsH.push(t.headH); t.rows.forEach(function () { rowsH.push(t.rowH); }); if (t.footer) rowsH.push(t.rowH);
        var nRows = rowsH.length, totalW = t.colW.reduce(function (a, b) { return a + b; }, 0), totalH = rowsH.reduce(function (a, b) { return a + b; }, 0);
        var th = t.textH, tth = t.titleTextH || t.textH, mh = Math.max(0.05, 0.3 * th), mv = Math.max(0.03, 0.15 * th);
        // block record + block με το «cache» των γραφικών (γραμμές + MTEXT), σε τοπικές συντεταγμένες (0,0 = πάνω-αριστερά)
        blkRecs.push(['  0', 'BLOCK_RECORD', '  5', brH, '330', brTableH, '100', 'AcDbSymbolTableRecord', '100', 'AcDbBlockTableRecord', '  2', name, '340', '0', '102', '{BLKREFS', '331', tblH, '102', '}', ' 70', '0', '280', '1', '281', '0'].join('\n'));
        var bl = ['  0', 'BLOCK', '  5', next(), '330', brH, '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockBegin', '  2', name, ' 70', '1', ' 10', '0.0', ' 20', '0.0', ' 30', '0.0', '  3', name, '  1', ''];
        function bline(x1, y1, x2, y2) { bl.push('  0', 'LINE', '  5', next(), '330', brH, '100', 'AcDbEntity', '  8', '0', '100', 'AcDbLine', ' 10', f(x1), ' 20', f(y1), ' 30', '0.0', ' 11', f(x2), ' 21', f(y2), ' 31', '0.0'); }
        function bmtext(cx, cy, w, text, h) { bl.push('  0', 'MTEXT', '  5', next(), '330', brH, '100', 'AcDbEntity', '  8', '0', '100', 'AcDbMText', ' 10', f(cx), ' 20', f(cy), ' 30', '0.0', ' 40', f(h), ' 41', f(Math.max(0, w)), ' 71', '5', ' 72', '5', '  1', mtxtML(String(text == null ? '' : text).slice(0, 250)), '  7', 'Standard'); }
        var y = 0; var rowTops = [];
        rowsH.forEach(function (h) { rowTops.push(y); y -= h; });
        bline(0, 0, totalW, 0); rowTops.forEach(function (yy, i) { bline(0, yy - rowsH[i], totalW, yy - rowsH[i]); });
        var xs = [0]; t.colW.forEach(function (w) { xs.push(xs[xs.length - 1] + w); });
        var r = 0;
        if (hasTitle) { bmtext(totalW / 2, -rowsH[0] / 2, totalW - 2 * mh, t.title, tth); r = 1; }
        var firstDataRow = r + 1;
        // κατακόρυφες: από την κεφαλίδα και κάτω
        var innerBottom = t.footer ? (-totalH + rowsH[rowsH.length - 1]) : -totalH; // η γραμμή εμβαδού (footer) μένει ενιαία, χωρίς κατακόρυφες
        xs.forEach(function (x) { bline(x, rowTops[r], x, innerBottom); }); bline(0, 0, 0, -totalH); bline(totalW, 0, totalW, -totalH);
        t.header.forEach(function (hd, c) { bmtext((xs[c] + xs[c + 1]) / 2, rowTops[r] - rowsH[r] / 2, t.colW[c] - 2 * mh, hd, th); }); r++;
        t.rows.forEach(function (row) { row.forEach(function (v, c) { if (v !== '' && v != null) bmtext((xs[c] + xs[c + 1]) / 2, rowTops[r] - rowsH[r] / 2, t.colW[c] - 2 * mh, String(v), th); }); r++; });
        if (t.footer) { bmtext(totalW / 2, rowTops[r] - rowsH[r] / 2, totalW - 2 * mh, t.footer, th); }
        bl.push('  0', 'ENDBLK', '  5', next(), '330', brH, '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockEnd');
        blocks.push(bl.join('\n'));
        // η οντότητα ACAD_TABLE
        var o = ['0', 'ACAD_TABLE', '5', tblH, '330', owner, '100', 'AcDbEntity', '8', t.layer || 'PINAKES', '100', 'AcDbBlockReference', '2', name, '10', f(t.x), '20', f(t.y), '30', '0.0', '100', 'AcDbTable', '342', tsH, '343', brH, '11', '1.0', '21', '0.0', '31', '0.0', '90', '22', '91', String(nRows), '92', String(cols), '93', '24', '94', '0', '95', '0', '96', '0', '40', f(mh), '41', f(mv)];
        rowsH.forEach(function (h) { o.push('141', f(h)); }); t.colW.forEach(function (w) { o.push('142', f(w)); });
        function cellText(text, h, merged, span, center) {
          if (merged) { o.push('171', '1', '172', '0', '173', '1', '174', '0', '175', '1', '176', '1', '91', '32', '178', '0', '145', '0.0', '140', f(h), '92', '0', '301', 'CELL_VALUE', '93', '3', '90', '0', '91', '0', '94', '0', '300', '', '302', '', '304', 'ACVALUE_END'); return; }
          o.push('171', '1', '172', '0', '173', '0', '174', '0', '175', String(span || 1), '176', '1', '91', center ? '262177' : '262176', '178', '0', '145', '0.0');
          if (center) o.push('170', '5');
          o.push('140', f(h), '92', '0', '301', 'CELL_VALUE');
          if (text === '' || text == null) o.push('93', '3', '90', '0', '91', '0', '94', '0', '300', '', '302', '', '304', 'ACVALUE_END');
          else { var ct = cleanML(text); o.push('93', '6', '90', '4', '1', ct, '94', '0', '300', '', '302', ct, '304', 'ACVALUE_END'); }
        }
        if (hasTitle) { cellText(t.title, tth, false, cols, true); for (var c1 = 1; c1 < cols; c1++) cellText('', tth, true); }
        t.header.forEach(function (hd) { cellText(hd, th, false, 1, true); });
        t.rows.forEach(function (row) { for (var c2 = 0; c2 < cols; c2++) cellText(row[c2] == null ? '' : String(row[c2]), th, false, 1, true); });
        if (t.footer) { cellText(t.footer, th, false, cols, true); for (var c3 = 1; c3 < cols; c3++) cellText('', th, true); }
        Array.prototype.push.apply(out, o); // native πίνακας (επεξεργάσιμος στο CAD)
        ext(t.x, t.y); ext(t.x + totalW, t.y - totalH);
      });
      U('PINAKES');
    }
    var body = out.join('\r\n');
    tpl = rewriteLayers(tpl, used, spec.layers || {}, next, !!opts.prune);
    if (blkRecs.length) {
      var bi = tpl.indexOf('\n  0\nTABLE\n  2\nBLOCK_RECORD\n'), be = tpl.indexOf('\n  0\nENDTAB\n', bi);
      var headB = tpl.slice(bi, be); var cnt = (headB.match(/\n  0\nBLOCK_RECORD\n/g) || []).length + blkRecs.length;
      tpl = tpl.slice(0, bi) + headB.replace(/\n 70\n\d+\n/, '\n 70\n' + cnt + '\n') + '\n' + blkRecs.join('\n') + tpl.slice(be);
      var si = tpl.indexOf('\n  0\nSECTION\n  2\nBLOCKS\n'), se = tpl.indexOf('\n  0\nENDSEC\n', si);
      tpl = tpl.slice(0, se) + '\n' + blocks.join('\n') + tpl.slice(se);
    }
    tpl = ensureStyle(tpl, FONT, next);
    // ACAD_TABLE χρειάζεται δήλωση CLASS στην ενότητα CLASSES — χωρίς αυτήν το AutoCAD απορρίπτει όλο το σχέδιο («drawing discarded»)
    if (blkRecs.length && tpl.indexOf('\n  1\nACAD_TABLE\n') < 0) {
      var ci = tpl.indexOf('\n  2\nCLASSES\n'), ce = ci >= 0 ? tpl.indexOf('\n  0\nENDSEC\n', ci) : -1;
      if (ce > 0) tpl = tpl.slice(0, ce) + '\n  0\nCLASS\n  1\nACAD_TABLE\n  2\nAcDbTable\n  3\nObjectDBX Classes\n 90\n1025\n 91\n' + blkRecs.length + '\n280\n0\n281\n1' + tpl.slice(ce);
    }
    // μεταβλητή $CTABLESTYLE: δεν υπάρχει στην κεφαλίδα των αρχείων του AutoCAD — αφαιρείται
    tpl = tpl.replace(/\n  9\n\$CTABLESTYLE\n  7\n[^\n]*/, '');
    tpl = tpl.replace(/(\$TEXTSTYLE\n  7\n)Standard/, '$1' + FONT);
    // ENTITIES: εισαγωγή πριν το ENDSEC της ενότητας
    var i = tpl.indexOf('\n  2\nENTITIES\n'); if (i < 0) throw new Error('Πρότυπο DXF χωρίς ENTITIES');
    var j = tpl.indexOf('ENDSEC', i);
    var k = tpl.lastIndexOf('0', j); k = tpl.lastIndexOf('\n', k) + 1;
    var res = tpl.slice(0, k) + body + '\r\n' + tpl.slice(k);
    res = res.replace(/\r?\n/g, '\r\n');
    var hmax = seed; res.replace(/\r\n\s*(?:5|105)\r\n([0-9A-Fa-f]+)\r\n/g, function (_, hx) { var v = parseInt(hx, 16); if (v >= hmax) hmax = v + 1; return _; });
    res = res.replace(/(\$HANDSEED\r?\n\s*5\r?\n)([0-9A-Fa-f]+)/, function (_, a) { return a + hmax.toString(16).toUpperCase(); });
    if (opts.insunits != null) res = res.replace(/(\$INSUNITS\r?\n\s*70\r?\n)\d+/, function (_, a) { return a + opts.insunits; });
    if (isFinite(x0)) {
      res = res.replace(/(\$EXTMIN\r?\n\s*10\r?\n)[^\r\n]+(\r?\n\s*20\r?\n)[^\r\n]+(\r?\n\s*30\r?\n)[^\r\n]+/, function (_, a, b, c) { return a + f(x0) + b + f(y0) + c + '0.0'; });
      res = res.replace(/(\$EXTMAX\r?\n\s*10\r?\n)[^\r\n]+(\r?\n\s*20\r?\n)[^\r\n]+(\r?\n\s*30\r?\n)[^\r\n]+/, function (_, a, b, c) { return a + f(x1) + b + f(y1) + c + '0.0'; });
      // αρχική προβολή (*Active VPORT) πάνω στο σχέδιο: αλλιώς κάποια CAD ανοίγουν στο (0,0) και η οθόνη φαίνεται κενή
      (function () {
        var i0 = res.indexOf('\r\n  2\r\n*Active\r\n'); if (i0 < 0) return;
        var i1 = res.indexOf('\r\n  0\r\n', i0 + 5); if (i1 < 0) return;
        var seg = res.slice(i0, i1).split('\r\n'), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, ar = 1.6, vh = Math.max((y1 - y0), (x1 - x0) / ar) * 1.05 || 100;
        for (var q = 1; q + 1 < seg.length; q += 2) { var g = seg[q].trim(); if (g === '12') seg[q + 1] = f(cx); else if (g === '22') seg[q + 1] = f(cy); else if (g === '40') seg[q + 1] = f(vh); else if (g === '41') seg[q + 1] = '1.6'; }
        res = res.slice(0, i0) + seg.join('\r\n') + res.slice(i1);
      })();
    }
    return res;
  }

  // τόξα (bulge) → σημεία, ώστε η γεωμετρία να είναι σωστή στην ανάλυση
  function expandBulges(pts, bul, closed) {
    if (!bul) return pts;
    var out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n]; out.push(a);
      var g = bul[i]; if (!g || (i === n - 1 && !closed)) continue;
      var th = 4 * Math.atan(g), cx = b[0] - a[0], cy = b[1] - a[1], L = Math.hypot(cx, cy); if (L < 1e-9) continue;
      var R = L / (2 * Math.sin(Math.abs(th) / 2)), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var h = Math.sqrt(Math.max(0, R * R - L * L / 4)) * (Math.abs(th) > Math.PI ? -1 : 1), s = g > 0 ? 1 : -1;
      var ox = mx - s * h * cy / L, oy = my + s * h * cx / L; // κέντρο
      var a0 = Math.atan2(a[1] - oy, a[0] - ox), steps = Math.max(2, Math.ceil(Math.abs(th) / (Math.PI / 12)));
      for (var k = 1; k < steps; k++) { var t = a0 + th * k / steps; out.push([ox + R * Math.cos(t), oy + R * Math.sin(t)]); }
    }
    return out;
  }

  // ---------- ανάγνωση DXF (είσοδος χρήστη) ----------
  // Επιστρέφει { polys:[{layer, pts, closed}], texts:[{layer,x,y,text,h,rot}], layers:[...] }
  // TEXT/MTEXT: σωστή θέση (σημείο στοίχισης), στοίχιση, γωνία και καθαρό κείμενο χωρίς κωδικούς μορφοποίησης
  // ονόματα layer: \U+XXXX / \M+1XXXX → χαρακτήρες (DXF R2000/R2004 με ελληνικά)
  function decU(v) { return String(v).indexOf('\\') < 0 ? v : String(v).replace(/\\U\+([0-9A-Fa-f]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }).replace(/\\M\+1([0-9A-Fa-f]{4})/g, function (_, h) { var c = parseInt(h, 16); try { return new TextDecoder('windows-1253').decode(new Uint8Array(c > 255 ? [c >> 8, c & 255] : [c])); } catch (e) { return '?'; } }); }
  function txtOut(c) {
    var x = c.x || 0, y = c.y || 0, al = 'left', rot = c.rot || 0, t = String(c.text || '');
    if (c.type === 'TEXT') { if ((c.h72 || c.v73) && isFinite(c.x2) && isFinite(c.y2)) { x = c.x2; y = c.y2; } al = c.h72 === 1 || c.h72 === 4 ? 'center' : c.h72 === 2 ? 'right' : 'left'; }
    else { var at = c.att || 1, col = (at - 1) % 3; al = col === 1 ? 'center' : col === 2 ? 'right' : 'left'; if (!c.rot && isFinite(c.x2) && isFinite(c.y2) && (c.x2 || c.y2)) rot = Math.atan2(c.y2, c.x2) * 180 / Math.PI;
      t = t.replace(/\\P/g, ' ').replace(/\\[AHWQTCfFpL][^;]*;/g, '').replace(/\\[LlOoKk~]/g, '').replace(/[{}]/g, ''); }
    // \U+XXXX (Unicode) και \M+1XXXX (MBCS) → χαρακτήρες
    t = t.replace(/\\U\+([0-9A-Fa-f]{4})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); }).replace(/\\M\+1([0-9A-Fa-f]{4})/g, function (_, h) { var c = parseInt(h, 16); try { return new TextDecoder('windows-1253').decode(new Uint8Array(c > 255 ? [c >> 8, c & 255] : [c])); } catch (e) { return '?'; } });
    t = t.replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '').replace(/\s+/g, ' ').trim();
    return { layer: c.layer, x: x, y: y, text: t, h: c.h || 1, rot: rot, align: al, color: c.col || 0 };
  }
  function arcPoly(c) {
    var full = c.type === 'CIRCLE', a0 = full ? 0 : (c.a0 || 0), a1 = full ? 360 : (c.a1 || 0); if (a1 <= a0) a1 += 360;
    var n = Math.max(8, Math.min(96, Math.ceil((a1 - a0) / 7.5))), pts = [];
    for (var k = 0; k <= n - (full ? 1 : 0); k++) { var a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; pts.push([c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)]); }
    return { layer: c.layer, pts: pts, closed: full, arc: true };
  }
  // ---------- τύποι γραμμής (LTYPE): απλοί διακεκομμένοι και σύνθετοι με κείμενο (π.χ. SYRMATOPLEGMA «--x--») ----------
  // Διαβάζει $LTSCALE, τον πίνακα LTYPE και το linetype κάθε LAYER, ώστε οι γραμμές να μη φαίνονται όλες συνεχείς.
  function readLtypes(lines) {
    var n = lines.length, i = 0, res = { ltscale: 1, defs: {}, layerLt: {} };
    function at(k) { return (lines[k] || '').trim(); }
    var cur = null, el = null, kind = null;
    function flush() {
      if (kind === 'LTYPE' && cur && cur.name) { var nm = cur.name.toUpperCase(); if (cur.els.length && cur.els.some(function (e) { return e.len < 0 || e.text; })) res.defs[nm] = cur; }
      else if (kind === 'LAYER' && cur && cur.name) res.layerLt[cur.name] = cur.lt || '';
      cur = null; el = null; kind = null;
    }
    while (i < n - 1) {
      var code = at(i), val = at(i + 1); i += 2;
      if (code === '0' && val === 'SECTION') continue;
      if (code === '9' && val === '$LTSCALE') { if (at(i) === '40') { var v = parseFloat(at(i + 1)); if (v > 0) res.ltscale = v; } continue; }
      if (code === '2' && val === 'ENTITIES') break;
      if (code === '0') {
        flush();
        if (val === 'LTYPE') { kind = 'LTYPE'; cur = { name: '', els: [], total: 0 }; }
        else if (val === 'LAYER') { kind = 'LAYER'; cur = { name: '', lt: '' }; }
        continue;
      }
      if (!cur) continue;
      if (code === '2') cur.name = val;
      else if (kind === 'LAYER' && code === '6') cur.lt = val;
      else if (kind === 'LTYPE') {
        if (code === '40') cur.total = parseFloat(val) || 0;
        else if (code === '49') { el = { len: parseFloat(val) || 0, flags: 0, sc: 1, rot: 0, dx: 0, dy: 0, text: '' }; cur.els.push(el); }
        else if (el) {
          if (code === '74') el.flags = parseInt(val, 10) || 0;
          else if (code === '46') el.sc = parseFloat(val) || 1;
          else if (code === '50') el.rot = parseFloat(val) || 0;
          else if (code === '44') el.dx = parseFloat(val) || 0;
          else if (code === '45') el.dy = parseFloat(val) || 0;
          else if (code === '9') el.text = val;
        }
      }
    }
    flush();
    return res;
  }
  // Σπάει μια γραμμή με τύπο γραμμής σε κομμάτια (segs) και σημάδια (marks: κείμενο/«x»), σε μονάδες σχεδίου.
  // Όπως στο CAD: μήκος μοτίβου × $LTSCALE × κλίμακα οντότητας· συνεχές μοτίβο σε όλη την πολυγραμμή.
  // Το κείμενο ενός στοιχείου τοποθετείται στο τέλος του στοιχείου που το φέρει, μετατοπισμένο κατά X/Y.
  function ltExpand(p, maxPieces) {
    var d = p && p.ltdef, k = p && p.ltk || 1, pts = p && p.pts;
    if (!d || !pts || pts.length < 2 || !(k > 0)) return null;
    var P = pts.slice(); if (p.closed) P.push(pts[0]);
    var per = d.els.reduce(function (a, e) { return a + Math.abs(e.len); }, 0) * k; if (!(per > 1e-9)) return null;
    var cum = [0]; for (var i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    var L = cum[cum.length - 1]; if (!(L > 0)) return null;
    if (L / per * d.els.length > (maxPieces || 20000)) return null; // πολύ πυκνό μοτίβο: μένει συνεχής
    var si = 0;
    function at(s) { if (s <= 0) si = 0; while (si < P.length - 2 && cum[si + 1] < s) si++; var a = P[si], b = P[si + 1], l = (cum[si + 1] - cum[si]) || 1e-12, f = Math.max(0, Math.min(1, (s - cum[si]) / l)); return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }
    function piece(s0, s1) { var out = [], q = at(s0); out.push([q.x, q.y]); for (var j = si + 1; j < P.length - 1 && cum[j] < s1; j++) out.push([P[j][0], P[j][1]]); q = at(s1); out.push([q.x, q.y]); return out; }
    var segs = [], marks = [], s = 0, guard = 0;
    while (s < L - 1e-9 && guard++ < 200000) {
      for (var e = 0; e < d.els.length && s < L - 1e-9; e++) {
        var el = d.els[e], len = Math.abs(el.len) * k, s1 = Math.min(L, s + len);
        if (el.len > 0) segs.push(piece(s, s1));
        if (el.text && (el.flags & 2) && s + len <= L + 1e-9) {
          var q = at(s1), ang = (el.flags & 1) ? el.rot * Math.PI / 180 : q.ang + el.rot * Math.PI / 180, c = Math.cos(q.ang), sn = Math.sin(q.ang);
          var h = (el.sc || 1) * k, ox = el.dx * k, oy = el.dy * k;
          marks.push({ x: q.x + ox * c - oy * sn, y: q.y + ox * sn + oy * c, cx: q.x, cy: q.y, ang: ang, h: h, text: el.text, ox: ox, oy: oy });
        }
        s = s1;
      }
    }
    return { segs: segs, marks: marks };
  }
  // Σημάδι ως γραμμές: «x»/«X»/«+» γίνονται δύο γραμμούλες στο κέντρο του γλύφου (όπως στο CAD), αλλιώς null (σχεδιάζεται ως κείμενο)
  function markStrokes(m) {
    var t = String(m.text || '').trim(); if (!/^[xX+]$/.test(t)) return null;
    var g = 0.68 * m.h / 2, c = Math.cos(m.ang), sn = Math.sin(m.ang);
    var cx = m.x + g * c - g * sn, cy = m.y + g * sn + g * c;   // κέντρο του γλύφου (γωνία κάτω αριστερά = θέση κειμένου)
    var r = t === '+' ? [[g, 0], [0, g]] : [[g, g], [g, -g]];
    return r.map(function (v) { var dx = v[0] * c - v[1] * sn, dy = v[0] * sn + v[1] * c; return [[cx - dx, cy - dy], [cx + dx, cy + dy]]; });
  }

  function parse(text) {
    var lines = text.split(/\r?\n/), n = lines.length;
    var polys = [], texts = [], layers = {};
    var LT = readLtypes(lines);
    var i = 0;
    function at(k) { return (lines[k] || '').trim(); }
    // τύπος γραμμής της οντότητας (ή του layer όταν είναι ByLayer) → ορισμός + συνολική κλίμακα
    function withLt(o, src) {
      var nm = String(src.lt || 'BYLAYER').toUpperCase();
      if (nm === 'BYLAYER') nm = String(LT.layerLt[src.layer] || '').toUpperCase();
      var d = LT.defs[nm]; if (d) { o.lt = nm; o.ltdef = d; o.ltk = LT.ltscale * (src.lts > 0 ? src.lts : 1); }
      return o;
    }
    // βρες ENTITIES
    while (i < n && !(at(i) === '2' && at(i + 1) === 'ENTITIES')) i += 2;
    i += 2;
    var cur = null, vtx = null, inPoly = null, blockDepth = 0;
    function flush() { if (cur) { if (cur.type === 'LWPOLYLINE' && cur.pts.length >= 2) polys.push(withLt({ layer: cur.layer, pts: expandBulges(cur.pts, cur.bul, !!(cur.flags & 1)), closed: !!(cur.flags & 1) }, cur)); else if (cur.type === 'LINE' && cur.a && cur.b) polys.push(withLt({ layer: cur.layer, pts: [cur.a, cur.b], closed: false }, cur)); else if ((cur.type === 'TEXT' || cur.type === 'MTEXT') && cur.text) texts.push(txtOut(cur)); else if ((cur.type === 'CIRCLE' || cur.type === 'ARC') && cur.r > 0 && cur.c) polys.push(withLt(arcPoly(cur), cur)); } cur = null; }
    while (i < n) {
      var code = at(i), val = at(i + 1); i += 2;
      if (code === '0') {
        if (val === 'ENDSEC') { flush(); if (inPoly) { polys.push(inPoly); inPoly = null; } break; }
        if (inPoly) {
          if (val === 'VERTEX') { vtx = {}; continue; }
          if (val === 'SEQEND') { if (inPoly.pts.length >= 2) polys.push(withLt({ layer: inPoly.layer, pts: inPoly.pts, closed: !!(inPoly.flags & 1) }, inPoly)); inPoly = null; vtx = null; continue; }
        }
        flush();
        if (val === 'POLYLINE') { inPoly = { layer: '0', pts: [], flags: 0 }; vtx = null; continue; }
        cur = { type: val, layer: '0', pts: [], flags: 0 };
        continue;
      }
      if (inPoly) {
        if (vtx) { if (code === '10') vtx.x = parseFloat(val); else if (code === '20') { vtx.y = parseFloat(val); if (vtx.x != null) { inPoly.pts.push([vtx.x, vtx.y]); } } }
        else { if (code === '8') inPoly.layer = decU(val); else if (code === '70') inPoly.flags = parseInt(val, 10) || 0; else if (code === '6') inPoly.lt = val; else if (code === '48') inPoly.lts = parseFloat(val) || 0; }
        continue;
      }
      if (!cur) continue;
      if (code === '8') { cur.layer = decU(val); layers[cur.layer] = 1; }
      else if (code === '6' && cur.type !== 'MTEXT') cur.lt = val;
      else if (code === '48' && cur.type !== 'MTEXT') cur.lts = parseFloat(val) || 0;
      else if (cur.type === 'LWPOLYLINE') { if (code === '70') cur.flags = parseInt(val, 10) || 0; else if (code === '10') cur._x = parseFloat(val); else if (code === '20') cur.pts.push([cur._x, parseFloat(val)]); else if (code === '42') { (cur.bul || (cur.bul = {}))[cur.pts.length - 1] = parseFloat(val) || 0; } }
      else if (cur.type === 'LINE') { if (code === '10') cur._ax = parseFloat(val); else if (code === '20') cur.a = [cur._ax, parseFloat(val)]; else if (code === '11') cur._bx = parseFloat(val); else if (code === '21') cur.b = [cur._bx, parseFloat(val)]; }
      else if (cur.type === 'TEXT' || cur.type === 'MTEXT') { if (code === '10') cur.x = parseFloat(val); else if (code === '20') cur.y = parseFloat(val); else if (code === '40') cur.h = parseFloat(val); else if (code === '1') cur.text = (cur.text || '') + val; else if (code === '3') cur.text = (cur.text || '') + val; else if (code === '50') cur.rot = parseFloat(val); else if (code === '11') cur.x2 = parseFloat(val); else if (code === '21') cur.y2 = parseFloat(val); else if (code === '72') cur.h72 = parseInt(val, 10) || 0; else if (code === '73') cur.v73 = parseInt(val, 10) || 0; else if (code === '71') cur.att = parseInt(val, 10) || 0; else if (code === '62') cur.col = parseInt(val, 10) || 0; }
      else if (cur.type === 'CIRCLE' || cur.type === 'ARC') { if (code === '10') cur._cx = parseFloat(val); else if (code === '20') cur.c = [cur._cx, parseFloat(val)]; else if (code === '40') cur.r = parseFloat(val); else if (code === '50') cur.a0 = parseFloat(val); else if (code === '51') cur.a1 = parseFloat(val); }
    }
    return { polys: polys, texts: texts, layers: Object.keys(layers) };
  }

  var api = { build: build, parse: parse, ltExpand: ltExpand, markStrokes: markStrokes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Dxf2000 = api;
})(typeof window !== 'undefined' ? window : globalThis);

