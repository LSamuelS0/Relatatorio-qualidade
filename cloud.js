/* =====================================================================
   CONEXÃO COM O FIREBASE (login, relatórios, rascunhos e fotos)
   ---------------------------------------------------------------------
   Expõe window.Cloud para o app.js e avisa com o evento "cloud-ready".

   Banco (Firestore):
     relatorios/{id}   relatório salvo     (owner = uid de quem fez)
     rascunhos/{id}    rascunho            (owner = uid)
     fotos/{id}        foto em base64      (owner = uid; 1 foto por documento)
     compartilhado/ultimoBloqueio   último Status de bloqueio da troca de turno
                                    (qualquer pessoa logada lê e grava)
     cadastro/injetora   máquinas e peças da Injetora (todos leem; só o ADM grava)
     cadastro/mascaras   textos fixos dos relatórios publicados pelo ADM
     ocorrencias/{id}    ocorrências da linha (todos leem; cada um lança as suas)

   O firebaseConfig NÃO é segredo: quem protege os dados são as regras de
   acesso (firestore.rules). A senha do ADM nunca fica no código.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, getDocFromServer, deleteDoc, collection, query, where, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAb5KC67o5TgP9ePZWWndbr7fmlueJ4GP8",
  authDomain: "relatorio-qualidade.firebaseapp.com",
  projectId: "relatorio-qualidade",
  storageBucket: "relatorio-qualidade.firebasestorage.app",
  messagingSenderId: "334482395709",
  appId: "1:334482395709:web:0811050addf642bab9d054"
};

const ADMIN_UID = "Rxejtj0jgEUEGfTup3yK9ngMvtH3";
const EMAIL_DOMAIN = "relatorio-qualidade.app";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* Matrícula (6 números) ou ADM → e-mail interno usado no Firebase. */
function loginToEmail(login) {
  const value = String(login || "").trim().toUpperCase();
  if (value === "ADM") return "adm@" + EMAIL_DOMAIN;
  if (/^\d{6}$/.test(value)) return value + "@" + EMAIL_DOMAIN;
  return null;
}
function emailToLogin(email) {
  const name = String(email || "").split("@")[0];
  return name.toUpperCase() === "ADM" ? "ADM" : name;
}

// Firestore não aceita campos "undefined"
const clean = value => JSON.parse(JSON.stringify(value));

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function base64ToBlob(base64, type) {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: type || "image/jpeg" });
}

const uid = () => (auth.currentUser ? auth.currentUser.uid : null);
function needUser() {
  if (!uid()) throw new Error("sem-login");
  return uid();
}

const Cloud = {
  user: null, // { uid, login, admin }

  onUser(callback) {
    onAuthStateChanged(auth, user => {
      Cloud.user = user ? { uid: user.uid, login: emailToLogin(user.email), admin: user.uid === ADMIN_UID } : null;
      callback(Cloud.user);
    });
  },

  async signIn(login, password) {
    const email = loginToEmail(login);
    if (!email) throw Object.assign(new Error("login-invalido"), { code: "login-invalido" });
    await signInWithEmailAndPassword(auth, email, password);
  },

  signOut: () => signOut(auth),

  /* Teste direto no servidor: mostra se o banco existe e se as regras deixam ler. */
  async ping() {
    needUser();
    await getDocFromServer(doc(db, "compartilhado", "ultimoBloqueio"));
  },

  /* Relatórios e rascunhos: um documento por item, com o dono. */
  async put(kind, item) {
    const owner = needUser();
    await setDoc(doc(db, kind, String(item.id)), clean({ ...item, owner }));
  },
  async remove(kind, id) {
    needUser();
    await deleteDoc(doc(db, kind, String(id)));
  },
  async listMine(kind) {
    const owner = needUser();
    const snapshot = await getDocs(query(collection(db, kind), where("owner", "==", owner)));
    return snapshot.docs.map(item => item.data());
  },
  /* Tempo real: avisa sempre que um relatório/rascunho da pessoa muda em qualquer aparelho. */
  watchMine(kind, onData, onError) {
    const owner = needUser();
    return onSnapshot(query(collection(db, kind), where("owner", "==", owner)),
      snapshot => onData(snapshot.docs.map(item => item.data())),
      error => onError && onError(error));
  },

  /* Ocorrências de um dia (de todas as pessoas), em tempo real. */
  watchDay(kind, date, onData, onError) {
    needUser();
    return onSnapshot(query(collection(db, kind), where("date", "==", date)),
      snapshot => onData(snapshot.docs.map(item => item.data())),
      error => onError && onError(error));
  },

  /* Só o administrador: todos os itens, de todas as pessoas. */
  async listAll(kind) {
    needUser();
    const snapshot = await getDocs(collection(db, kind));
    return snapshot.docs.map(item => item.data());
  },

  /* Fotos: base64 dentro do banco (plano grátis). Máx. ~1 MB por documento. */
  async putPhoto(id, blob) {
    const owner = needUser();
    const data = await blobToBase64(blob);
    await setDoc(doc(db, "fotos", id), { owner, type: blob.type || "image/jpeg", data, size: blob.size });
  },
  async getPhoto(id) {
    needUser();
    const snapshot = await getDoc(doc(db, "fotos", id));
    if (!snapshot.exists()) return null;
    const value = snapshot.data();
    return base64ToBlob(value.data, value.type);
  },
  async removePhoto(id) {
    needUser();
    await deleteDoc(doc(db, "fotos", id));
  },

  /* Cadastro da Injetora (máquinas e peças): todos leem, só o ADM grava. */
  async getCadastro() {
    needUser();
    const snapshot = await getDoc(doc(db, "cadastro", "injetora"));
    return snapshot.exists() ? snapshot.data() : null;
  },
  watchCadastro(onData, onError) {
    needUser();
    return onSnapshot(doc(db, "cadastro", "injetora"),
      snapshot => onData(snapshot.exists() ? snapshot.data() : null),
      error => onError && onError(error));
  },
  async saveCadastro(value) {
    needUser();
    await setDoc(doc(db, "cadastro", "injetora"), clean({ ...value, updatedAt: new Date().toISOString(), by: uid() }));
  },

  /* Outras configurações do ADM em cadastro/{nome} (ex.: "mascaras"). */
  watchConfig(name, onData, onError) {
    needUser();
    return onSnapshot(doc(db, "cadastro", name),
      snapshot => onData(snapshot.exists() ? snapshot.data() : null),
      error => onError && onError(error));
  },
  async saveConfig(name, value) {
    needUser();
    await setDoc(doc(db, "cadastro", name), clean({ ...value, updatedAt: new Date().toISOString(), by: uid() }));
  },

  /* Último Status de bloqueio da troca de turno (de qualquer pessoa). */
  async setLastBlock(value) {
    needUser();
    await setDoc(doc(db, "compartilhado", "ultimoBloqueio"), clean({ ...value, by: uid() }));
  },
  async getLastBlock() {
    needUser();
    const snapshot = await getDoc(doc(db, "compartilhado", "ultimoBloqueio"));
    return snapshot.exists() ? snapshot.data() : null;
  }
};

window.Cloud = Cloud;
window.dispatchEvent(new Event("cloud-ready"));
