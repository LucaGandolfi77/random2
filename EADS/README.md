# Embedded Analysis & Debug Studio 0.8.0

Release ricostruita con Explorer stabile, Cppcheck e Doxygen.

## Correzioni principali

- Il contenuto del file è mostrato esplicitamente nel viewer tramite `textContent`.
- La regola `[hidden]` impedisce al layout CSS di rendere visibile contemporaneamente il placeholder e l'editor.
- L'albero ha altezza controllata, `min-height: 0` e scrollbar verticale sempre disponibile.
- Cppcheck e Doxygen sono profili integrati anche se mancano nel vecchio `projects.json`.
- L'API `/analysis-profiles` indica se gli eseguibili sono disponibili.
- Cppcheck produce report testuale, XML e JSON di riepilogo.
- Doxygen genera HTML, XML, warning log e il Doxyfile realmente utilizzato.

## Dipendenze

```bash
sudo apt update
sudo apt install -y cppcheck doxygen
```

La presenza degli strumenti viene verificata automaticamente: la scheda *Analysis*
mostra lo stato di `cppcheck` e `doxygen` e disabilita i pulsanti per gli strumenti
non installati. `graphviz` non è richiesto, perché la configurazione Doxygen generata
imposta `HAVE_DOT = NO`.

## Installazione

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m pytest -vv --no-cov
python app.py
```

Aprire `http://127.0.0.1:5000` e usare `Ctrl+Shift+R` per eliminare gli asset precedenti dalla cache.

## Toolchain RTEMS

Il pacchetto `rtems-gr740-6.2.tar.xz` va estratto in `/opt/rtems/rtems-gr740-6.2`:

```bash
sudo mkdir -p /opt/rtems
sudo tar -xJf rtems-gr740-6.2.tar.xz -C /opt/rtems
```

Gli strumenti sono già compilati, non è necessario costruire nulla. Verifica:

```bash
/opt/rtems/rtems-gr740-6.2/bin/sparc-rtems6-gcc -dumpmachine
# sparc-rtems6
```

I BSP disponibili sono `gr740-smp-qual-only`, `gr740-smp-qual-only-coverage`,
`gr740-smp-extra`, `gr740-uni-qual-only`, `gr740-uni-qual-only-coverage` e
`gr740-uni-extra`. Il valore `bsp` in `projects.json` deve corrispondere al nome
del BSP, senza il prefisso `sparc-rtems6-`.

L'esecuzione e il debug usano il simulatore **SIS**, incluso nel pacchetto:

```bash
/opt/rtems/rtems-gr740-6.2/bin/sis -gr740 app.elf
```

## Profili di esecuzione e debug

I profili sono definiti per progetto in `projects.json`, nelle liste
`execution_profiles` e `debug_profiles`. I segnaposto `{rtems}` e `{elf}` vengono
sostituiti rispettivamente da `rtems_path` e dal percorso assoluto del binario.

```json
"execution_profiles": [
  {
    "id": "sis",
    "executable": "{rtems}/bin/sis",
    "arguments": ["-gr740", "-m", "4", "{elf}"]
  }
]
```

```json
"debug_profiles": [
  {
    "id": "sis-remote",
    "server_executable": "{rtems}/bin/sis",
    "server_arguments": ["-gr740", "-gdb", "{elf}"],
    "remote": "localhost:1234",
    "gdb_executable": "{rtems}/bin/gdb"
  }
]
```

Gli identificatori dei profili sono quelli da inserire nei campi *execution profile*
e *debug profile*. Nota: nel pacchetto RTEMS i binari `gdb` e `gdbserver` non
portano il prefisso del target, a differenza di `gcc`, `objdump` e `addr2line`.

## Report

I risultati vengono salvati sotto:

```text
<project>/build-analysis-studio/evidence/
```

Cppcheck:

```text
cppcheck-<timestamp>.txt
cppcheck-<timestamp>.xml
latest-cppcheck.json
```

Doxygen:

```text
doxygen-<timestamp>/html/index.html
doxygen-<timestamp>/xml/index.xml
doxygen-<timestamp>/doxygen-warnings.log
doxygen-<timestamp>/Doxyfile
latest-doxygen.json
```
