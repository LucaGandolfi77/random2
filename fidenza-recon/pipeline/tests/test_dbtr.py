from __future__ import annotations

from fidenza_recon.analyze.dbtr import parse_edi_response, parse_uvl_response

UVL_RESPONSE = (
    "@UVL_Unita_volumetrica Objectid;Ty_porz;D_ty_porz;Ty_intr;D_ty_intr;H_intr;"
    "Base;D_base;Tetto;D_tetto;B_uvl;H_uvl;V_uvl;Edi_id_e;Shape;Ty_e;Id_e;"
    "Dt_ini_val;Data_agg;D_TIPO_AGG;Dt_pres;St_valid;St_certif;Qualita;Metodo;"
    "D_metodo;Comp_fonti;Sez_id_e;Tipo_fonte;Data_da;Data_a;H_GRONDA;H_COLMO;"
    "ID_AGG;DT_FIN_VAL;SHAPE.AREA;SHAPE.LEN; "
    "1124432;1;generica;98;Non assegnato;Null;98;Non assegnato;98;Non assegnato;"
    "75,28;23;Null;d3e5cbc8;Polygon;UVL;477c3cf2;18/01/2012;21/10/2011;Massivo;"
    "Null;Null;Null;20;1;Primo caricamento;00;Null;DTM DSM 2008;01/01/2008;"
    "31/12/2008;Null;Null;100002011;Null;764,043367;129,60902;"
)

EDI_RESPONSE = (
    "@EDI_Edificio Objectid;Stat_e;D_stat_e;Ty_edi;D_ty_edi;Nome;COD_COM;SEZ;"
    "FOGLIO;NUMERO;ALLEGATO;SVILUPPO;Shape;Ty_e;Id_e;Dt_ini_val;Data_agg;"
    "D_TIPO_AGG;Dt_pres;St_valid;St_certif;Qualita;Metodo;D_metodo;Comp_fonti;"
    "Sez_id_e;Tipo_fonte;Data_da;Data_a;ID_AGG;DT_FIN_VAL;SHAPE.AREA;SHAPE.LEN; "
    "3007133;1;in esercizio;6;chiesa/basilica; ;B034;_;103;C;0;0;Polygon;EDI;"
    "d3e5cbc8;01/01/1979;21/10/2011;Massivo;31/07/2008;0;0;01;1;"
    "Primo caricamento;03;CTR5;01/01/1977;31/12/1998;100002011;Null;1043,675879;"
    "158,779703;"
)


def test_uvl_response_parses_height_and_base() -> None:
    rows = parse_uvl_response(UVL_RESPONSE)
    assert len(rows) == 1
    row = rows[0]
    assert row["H_uvl"] == "23"
    assert row["B_uvl"] == "75,28"
    assert row["Id_e"] == "477c3cf2"


def test_edi_response_parses_type() -> None:
    rows = parse_edi_response(EDI_RESPONSE)
    assert len(rows) == 1
    assert rows[0]["D_ty_edi"] == "chiesa/basilica"
    assert rows[0]["Objectid"] == "3007133"
