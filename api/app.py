from flask import Flask, request, jsonify
from elasticsearch import Elasticsearch
from dotenv import load_dotenv
import os, json, logging, unicodedata, urllib.request
from datetime import datetime
from flask_cors import CORS

# Try to load .env from current directory, or from parent directory (e.g., if running from api/)
env_path = ".env"
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")

load_dotenv(env_path)

# ================= COLORES =================
RESET = "\033[0m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
GRAY = "\033[90m"

# ================= CONFIG =================
ES_HOST = os.getenv("ES_HOST")
ES_USER = os.getenv("ES_USER")
ES_PASSWD = os.getenv("ES_PASSWD")

# Unificar tokens: aceptamos tanto AUTHORIZED_TOKENS (json array) como BACKEND_BEARER_TOKEN (string)
AUTHORIZED_TOKENS = json.loads(os.getenv("AUTHORIZED_TOKENS", "[]"))
if not AUTHORIZED_TOKENS:
    single_token = os.getenv("BACKEND_BEARER_TOKEN")
    if single_token:
        AUTHORIZED_TOKENS = [single_token]

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


def call_groq(prompt, max_tokens=100):
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")
    payload = json.dumps(
        {
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }
    ).encode()
    req = urllib.request.Request(
        GROQ_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    return data["choices"][0]["message"]["content"].strip()


es = Elasticsearch(ES_HOST, basic_auth=(ES_USER, ES_PASSWD), request_timeout=60)


app = Flask(__name__)
CORS(app)


# ================= SEARCH ESP =================
@app.route("/searchesp", methods=["POST"])
def search_esp():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="espana,padronespana",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (ESP): {str(e)}"}), 500
    return jsonify({"query": query, "results": res["hits"]["hits"]})


# ================= SEARCH ARG =================
@app.route("/searcharg", methods=["POST"])
def search_arg():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="argentina",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 100,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (ARG): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    if not hits:
        return jsonify(
            {"text": "❌ No se encontraron registros en la base de datos de Argentina."}
        )

    lines = []
    for h in hits:
        try:
            content = h["_source"]["content"]
            lines.append(content)
        except:
            pass

    return jsonify({"raw_data": "\n".join(lines)})


# ================= SEARCH SLV =================
@app.route("/searchslv", methods=["POST"])
def search_slv():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="elsalvador",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (SLV): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH NIC =================
@app.route("/searchnic", methods=["POST"])
def search_nic():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="nicaragua",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (NIC): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH PER =================
@app.route("/searchper", methods=["POST"])
def search_per():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="peru",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (PER): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH CHI =================
@app.route("/searchchi", methods=["POST"])
def search_chi():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="chile",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (CHI): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH CAN =================
@app.route("/searchcan", methods=["POST"])
def search_can():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="canada",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (CAN): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH BOL =================
@app.route("/searchbol", methods=["POST"])
def search_bol():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="bolivia",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (BOL): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH ECU =================
@app.route("/searchecu", methods=["POST"])
def search_ecu():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="ecuador",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (ECU): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH VEN =================
@app.route("/searchven", methods=["POST"])
def search_ven():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="venezuela",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (VEN): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH PAR =================
@app.route("/searchpar", methods=["POST"])
def search_par():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="paraguay",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (PAR): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH MEX =================
@app.route("/searchmex", methods=["POST"])
def search_mex():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="mexico",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (MEX): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= SEARCH CENSO =================
@app.route("/searchcenso", methods=["POST"])
def search_censo():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    query = request.json.get("query", "").strip()
    request._query_value = query

    if not query:
        return jsonify({"error": "Query vacío"}), 400

    try:
        res = es.search(
            index="censoesp",
            body={
                "query": {"match": {"content": {"query": query, "operator": "and"}}},
                "size": 50,
            },
        )
    except Exception as e:
        return jsonify({"detail": f"Elasticsearch Error (CENSO): {str(e)}"}), 500

    hits = res["hits"]["hits"]
    return jsonify({"query": query, "results": hits})


# ================= AUTH =================
def check_auth():
    auth = request.headers.get("Authorization")
    return (
        auth and auth.startswith("Bearer ") and auth.split(" ")[1] in AUTHORIZED_TOKENS
    )


def full_token():
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer ") and len(auth.split(" ")) > 1:
        return auth.split(" ")[1]
    return "—"


# ================= UTILS =================
def calcular_edad(fecha):
    try:
        if not fecha:
            return None
        if "/" in fecha:
            d, m, y = fecha.split("/")
        else:
            y, m, d = fecha.split("-")
        nac = datetime(int(y), int(m), int(d))
        hoy = datetime.now()
        return hoy.year - nac.year - ((hoy.month, hoy.day) < (nac.month, nac.day))
    except:
        return None


def obtener_localizacion(direccion):
    cp = direccion[-5:] if direccion[-5:].isdigit() else "DESCONOCIDO"
    try:
        texto = call_groq(
            f"Devuelve solo Municipio, Provincia y Comunidad Autónoma del CP {cp}",
            max_tokens=50,
        )
        return cp, texto
    except:
        return cp, "Localización no disponible"


def detectar_year(f):
    return (
        2011 if "2011" in f else 2018 if "2018" in f else 2022 if "2022" in f else None
    )


# ================= PADRON ESP =================
@app.route("/padronesp", methods=["POST"])
def padron_esp():
    if not check_auth():
        return jsonify({"error": "No autorizado"}), 401

    nombre = request.json.get("nombre", "").strip()
    request._query_value = nombre

    if not nombre or len(nombre) < 3:
        return jsonify({"error": "Nombre demasiado corto"}), 400

    # 🔴 PROTECCIÓN ANTI-SCRAP: Rechazar nombres demasiado comunes
    nombres_comunes = [
        "jose",
        "maria",
        "juan",
        "antonio",
        "manuel",
        "francisco",
        "david",
        "javier",
        "carlos",
        "miguel",
        "angel",
        "luis",
        "alejandro",
        "pedro",
        "jorge",
        "rafael",
        "daniel",
        "sergio",
    ]

    nombre_lower = nombre.lower()
    palabras = nombre_lower.split()

    # Si es un solo nombre y es común, rechazar
    if len(palabras) == 1 and palabras[0] in nombres_comunes:
        return jsonify(
            {"error": "Nombre demasiado común. Por favor, añada apellidos."}
        ), 400

    # Búsqueda por nombre: match_phrase (frase exacta)
    res = es.search(
        index="padronespana",
        body={
            "query": {
                "bool": {
                    "should": [
                        {"match_phrase": {"Nombre y apellidos": nombre}},
                        {"match_phrase": {"nombre": nombre}},
                        {"match_phrase": {"content": nombre}},
                    ]
                }
            }
        },
        size=10,
    )

    hits = res["hits"]["hits"]
    if not hits:
        return jsonify({"objetivo": nombre, "direcciones": []})

    direcciones = {}

    for h in hits:
        try:
            source = h["_source"]
            p = None

            # Try parsing legacy content field first (can have trailing comma)
            if "content" in source:
                try:
                    content_str = source["content"].rstrip().rstrip(",")
                    p = json.loads(content_str)
                except:
                    p = None

            # Fall back to new flat structure
            if not p and ("Nombre y apellidos" in source or "direccion" in source):
                p = source

            if not p:
                continue

            d = p.get("direccion") or p.get("Dirección")
            if not d:
                continue
            direcciones.setdefault(d, {"years": set()})
            y = detectar_year(source.get("file", ""))
            if y:
                direcciones[d]["years"].add(y)
        except:
            pass

        # 🔴 LIMITAR a máximo 3 direcciones por nombre
        if len(direcciones) >= 3:
            break

    salida = []

    # 🔴 LÍMITE GLOBAL: procesar máximo 20 personas EN TOTAL
    personas_procesadas_global = 0
    max_personas_global = 20

    for d, info in direcciones.items():
        # Buscar TODAS las personas de esta dirección (como el código antiguo)
        # Buscar en campos reales (post-reindex) o content (legacy)
        rdir = es.search(
            index="padronespana",
            body={
                "query": {
                    "bool": {
                        "should": [
                            {"match_phrase": {"direccion": d}},
                            {"match_phrase": {"Dirección": d}},
                            {"match_phrase": {"content": d}},
                        ]
                    }
                }
            },
            size=3000,  # 🔴 IGUAL que el código antiguo
        )

        # 🔴 EXACTA MISMA LÓGICA DEL CÓDIGO ANTIGUO:
        personas = {}
        for h in rdir["hits"]["hits"]:
            try:
                source = h["_source"]
                p = None

                # Try parsing legacy content field first (can have trailing comma)
                if "content" in source:
                    try:
                        content_str = source["content"].rstrip().rstrip(",")
                        p = json.loads(content_str)
                    except:
                        p = None

                # Fall back to new flat structure
                if not p and (
                    "Nombre y apellidos" in source or "fecha_nacimiento" in source
                ):
                    p = source

                if not p:
                    continue

                n = p.get("Nombre y apellidos")
                if n:
                    # 🔴 Evitar duplicados dentro de la misma dirección (diccionario)
                    if n not in personas:
                        personas[n] = p
                        personas_procesadas_global += 1

                        # 🔴 PARAR si ya alcanzamos el límite global de 20 personas
                        if personas_procesadas_global >= max_personas_global:
                            break
            except:
                pass

            # 🔴 PARAR bucle si alcanzamos límite global
            if personas_procesadas_global >= max_personas_global:
                break

        cp, loc = obtener_localizacion(d)

        # 🔴 SIEMPRE incluir la dirección aunque tenga 0 personas
        # (Esto es lo que hacía el código antiguo y es correcto)
        salida.append(
            {
                "direccion": d,
                "codigo_postal": cp,
                "localizacion": loc,
                "years": sorted(info["years"]),
                "personas_count": len(personas),
                "personas": [
                    {
                        "nombre": p.get("Nombre y apellidos"),
                        "fecha_nacimiento": p.get("fecha_nacimiento"),
                        "edad": calcular_edad(p.get("fecha_nacimiento")),
                        "nuc": p.get("nuc"),
                    }
                    for p in personas.values()
                ],
            }
        )

        # 🔴 PARAR procesamiento de más direcciones si alcanzamos límite global
        if personas_procesadas_global >= max_personas_global:
            # 🔴 IMPORTANTE: Si hemos procesado personas en esta dirección,
            # pero aún no hemos mostrado todas las direcciones encontradas,
            # mostramos una advertencia especial
            if len(salida) < len(direcciones):
                return jsonify(
                    {
                        "objetivo": nombre,
                        "advertencia": f"Límite de {max_personas_global} personas alcanzado. No se muestran todas las direcciones encontradas.",
                        "total_personas": personas_procesadas_global,
                        "direcciones": salida,
                    }
                )
            break

    # 🔴 PROTECCIÓN FINAL: Si hay demasiadas personas, mostrar advertencia
    if personas_procesadas_global >= max_personas_global:
        return jsonify(
            {
                "objetivo": nombre,
                "advertencia": f"Límite de {max_personas_global} personas alcanzado. Refine su búsqueda.",
                "total_personas": personas_procesadas_global,
                "direcciones": salida,
            }
        )

    return jsonify(
        {
            "objetivo": nombre,
            "total_personas": personas_procesadas_global,
            "direcciones": salida,
        }
    )


# ================= STATS ENDPOINT =================
@app.route("/stats", methods=["GET"])
def get_stats():
    # Mapping from alias name to region id used in frontend
    alias_to_region = {
        "espana": "es",
        "argentina": "ar",
        "elsalvador": "sv",
        "nicaragua": "ni",
        "peru": "pe",
        "chile": "cl",
        "bolivia": "bo",
        "ecuador": "ec",
        "venezuela": "ve",
        "paraguay": "py",
        "canada": "ca",
    }

    stats = {}
    for alias, region_id in alias_to_region.items():
        try:
            print(f"\n\n{'=' * 60}")
            print(f"\nProcessing alias: {alias} -> {region_id}")

            # Get document count using the alias
            count = es.count(index=alias)["count"]
            print(f"\nDocument count: {count}")

            # Get stats for the alias
            alias_stats = es.indices.stats(index=alias)

            # Get size from stats
            # The stats response has structure: {"_all": {...}, "indices": {...}}
            total_size_bytes = alias_stats["_all"]["total"]["store"]["size_in_bytes"]
            size_gb = total_size_bytes / (1024**3)
            leak_size = f"{size_gb:.1f} GB"
            print(f"\nAlias size: {leak_size} ({total_size_bytes} bytes)")

            # Get alias information to find the underlying index
            alias_info = es.indices.get_alias(name=alias)
            index_name = list(alias_info.keys())[0] if alias_info else alias
            print(f"\nUnderlying index: {index_name}")

            # Get index creation date
            index_info = es.indices.get(index=index_name)
            creation_date_ms = index_info[index_name]["settings"]["index"].get(
                "creation_date", "0"
            )
            creation_date = datetime.fromtimestamp(int(creation_date_ms) / 1000)
            print(f"\nIndex creation date: {creation_date}")

            # Calculate relative time
            now = datetime.now()
            diff = now - creation_date
            days = diff.days

            if days == 0:
                last_scan = "hoy"
            elif days == 1:
                last_scan = "hace 1 día"
            elif days < 7:
                last_scan = f"hace {days} días"
            elif days < 30:
                weeks = days // 7
                last_scan = f"hace {weeks} semana{'s' if weeks > 1 else ''}"
            elif days < 365:
                months = days // 30
                last_scan = f"hace {months} mes{'es' if months > 1 else ''}"
            else:
                years = days // 365
                last_scan = f"hace {years} año{'s' if years > 1 else ''}"

            print(f"\nLast scan: {last_scan}")

            stats[region_id] = {
                "doc_count": count,
                "leakSize": leak_size,
                "last_scan": last_scan,
            }
        except Exception as e:
            print(f"\nError getting stats for {alias}: {e}")
            stats[region_id] = {
                "doc_count": 0,
                "leakSize": "0.0 GB",
                "last_scan": "desconocido",
            }

    print(f"\n\n{'=' * 60}")
    print("Final stats response:")
    print(json.dumps(stats, indent=2))

    return jsonify(stats)


# ================= RUN =================
if __name__ == "__main__":
    logging.getLogger("werkzeug").setLevel(logging.ERROR)
    print(f"\n{BLUE}API escuchando en http://0.0.0.0:5000{RESET}")
    app.run(host="0.0.0.0", port=5000)
