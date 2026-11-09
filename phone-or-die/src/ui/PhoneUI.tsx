import { useEffect, useState } from 'react';
import { useGameStore, contactLineStatus, contactThreatProtection, availableContactCalls, unreadMessages } from '@/core/gameStore';
import { contacts, contactById } from '@/data/contacts';
import { messages, messageById } from '@/data/messages';
import { callById } from '@/data/calls';
import { formatNightTime } from '@/systems/clock';
import { stageInfo, criticalThreat } from '@/systems/threat';
import { answerChance, callSignalQuality, contactStatus } from '@/systems/calls';
import { Portrait } from '@/ui/Portrait';
import { cx, percent, formatPlayTime } from '@/utils';
import type { ContactDef, ContactId, PhoneTab } from '@/core/types';

function SignalBars({ quality }: { quality: number }) {
  return (
    <span className="signal-bars" aria-label={`Signal ${quality + 1} of 4`}>
      {[0, 1, 2, 3].map((index) => (
        <i key={index} className={cx(index <= quality && 'on')} />
      ))}
    </span>
  );
}

function StatusBar() {
  const game = useGameStore((state) => state.game);
  const activeCall = useGameStore((state) => state.activeCall);
  if (!game) return null;
  const stage = stageInfo(game.threat);
  const quality = activeCall ? callSignalQuality(game) : 3;
  return (
    <div className={cx('phone-status-bar', criticalThreat(game.threat) && 'threat-critical')}>
      <span className="phone-status-time">{formatNightTime(game.nightMinute)}</span>
      <span className={cx('phone-threat-dot', `stage-${stage.stage}`)} title={stage.label} />
      <span className="phone-status-right">
        <SignalBars quality={quality} />
        <span className={cx('phone-battery', game.battery <= 20 && 'low')}>
          <i style={{ width: `${game.battery}%` }} />
          {Math.round(game.battery)}%
        </span>
      </span>
    </div>
  );
}

function PhoneNav({ current, onChange }: { current: PhoneTab; onChange: (tab: PhoneTab) => void }) {
  const game = useGameStore((state) => state.game);
  const unread = game ? unreadMessages(game) : 0;
  const missed = game ? game.callHistory.filter((entry) => entry.type === 'missed').length : 0;
  const tabs: { id: PhoneTab; icon: string; label: string; badge: number }[] = [
    { id: 'home', icon: '⌂', label: 'Home', badge: 0 },
    { id: 'contacts', icon: '◉', label: 'Contacts', badge: 0 },
    { id: 'messages', icon: '✉', label: 'Messages', badge: unread },
    { id: 'history', icon: '↻', label: 'History', badge: missed }
  ];
  return (
    <nav className="phone-nav">
      {tabs.map((tab) => (
        <button key={tab.id} className={cx(current === tab.id && 'active')} onClick={() => onChange(tab.id)}>
          <span className="phone-nav-icon">
            {tab.icon}
            {tab.badge > 0 && <i className="phone-nav-badge">{tab.badge}</i>}
          </span>
          <small>{tab.label}</small>
        </button>
      ))}
    </nav>
  );
}

function ContactRow({ contact, onClick }: { contact: ContactDef; onClick: () => void }) {
  const game = useGameStore((state) => state.game);
  if (!game) return null;
  const state = game.contacts[contact.id];
  const status = contactStatus(contact, state, game);
  const unread = game.deliveredMessages.filter((id) => messageById[id]?.contactId === contact.id && !game.readMessages.includes(id)).length;
  return (
    <button className={cx('contact-row', `status-${status.key}`)} onClick={onClick}>
      <Portrait portrait={contact.portrait} size="sm" />
      <span className="contact-row-mid">
        <strong>{contact.name}</strong>
        <small>{contact.relationship}</small>
        <span className={cx('contact-status', `is-${status.key}`)}>{status.label}</span>
      </span>
      <span className="contact-row-right">
        {unread > 0 && <i className="unread-badge">{unread}</i>}
        <span>{state.trust}/10</span>
        <small>{state.answered} calls</small>
      </span>
    </button>
  );
}

function HomeScreen() {
  const game = useGameStore((state) => state.game);
  const setPhoneTab = useGameStore((state) => state.setPhoneTab);
  const selectContact = useGameStore((state) => state.selectContact);
  const showTimers = useGameStore((state) => state.settings.showTimers);
  if (!game) return null;
  const unread = unreadMessages(game);
  const missed = game.callHistory.filter((entry) => entry.type === 'missed').length;
  const answered = game.stats.callsAnswered;
  const recentMessages = game.deliveredMessages
    .map((id) => messageById[id])
    .filter(Boolean)
    .slice(-3)
    .reverse();
  const stage = stageInfo(game.threat);

  return (
    <div className="phone-page phone-home">
      <div className="phone-home-wallpaper">
        <div className="home-window" />
        <div className="home-shadow" />
      </div>
      <div className="home-topline">
        <span className="eyebrow">10:00 PM — 6:00 AM</span>
        <span className="home-stage">{stage.label}</span>
      </div>
      <h2 className="home-greeting">Keep the line open, Emma.</h2>
      <p className="home-sub">
        {game.shieldSteps > 0
          ? `The line holds for ${game.shieldSteps} more steps.`
          : game.shieldSeconds > 0
            ? showTimers
              ? `A voice is holding the road back for ${Math.ceil(game.shieldSeconds)} more seconds.`
              : 'A voice is holding the road back.'
            : 'No one is on the line. The street is moving.'}
      </p>
      <div className="home-alert">
        <span className={cx('threat-orb', `stage-${stage.stage}`)} />
        <div>
          <strong>{stage.label}</strong>
          <p>{stage.description}</p>
        </div>
      </div>

      <div className="home-grid">
        <button onClick={() => setPhoneTab('contacts')}>
          <span className="home-app-icon">◉</span>
          <strong>Contacts</strong>
          <small>9 people</small>
        </button>
        <button onClick={() => setPhoneTab('messages')}>
          <span className="home-app-icon">✉</span>
          <strong>Messages</strong>
          <small>{unread ? `${unread} unread` : 'No new messages'}</small>
        </button>
        <button onClick={() => setPhoneTab('history')}>
          <span className="home-app-icon">↻</span>
          <strong>History</strong>
          <small>{missed ? `${missed} missed` : 'No missed calls'}</small>
        </button>
        <button onClick={() => setPhoneTab('contacts')}>
          <span className="home-app-icon">☎</span>
          <strong>Emergency</strong>
          <small>Call someone</small>
        </button>
      </div>

      <div className="home-call-stats">
        <div><span>Calls answered</span><strong>{answered}</strong></div>
        <div><span>Clues</span><strong>{game.clues.length}</strong></div>
        <div><span>Threat</span><strong>{Math.round(game.threat)}%</strong></div>
      </div>

      <div className="home-notifications">
        <div className="home-section-title"><span>Recent messages</span><button onClick={() => setPhoneTab('messages')}>Open</button></div>
        {recentMessages.length ? recentMessages.map((message) => (
          <button key={message.id} className="home-message" onClick={() => { setPhoneTab('messages'); }}>
            <span>{message.from}</span>
            <p>{message.text.length > 72 ? `${message.text.slice(0, 72)}…` : message.text}</p>
            <small>{formatNightTime(message.at)}</small>
          </button>
        )) : <p className="phone-empty">No messages yet.</p>}
      </div>

      <button className="home-quick-call" onClick={() => { setPhoneTab('contacts'); selectContact('sophie'); }}>
        <span className="call-pulse" /> Call Sophie
      </button>
    </div>
  );
}

function ContactDetail({ contact }: { contact: ContactDef }) {
  const game = useGameStore((state) => state.game);
  const selectContact = useGameStore((state) => state.selectContact);
  const startCall = useGameStore((state) => state.startCall);
  if (!game) return null;
  const state = game.contacts[contact.id];
  const status = contactLineStatus(game, contact.id);
  const protection = contactThreatProtection(game, contact.id);
  const available = availableContactCalls(game, contact.id);
  const chance = answerChance(contact, state, game.difficulty, game.nightMinute);
  return (
    <div className="phone-page contact-detail">
      <button className="phone-back" onClick={() => selectContact(null)}>← Contacts</button>
      <div className="contact-hero">
        <Portrait portrait={contact.portrait} size="lg" />
        <div>
          <span className="eyebrow">{contact.relationship}</span>
          <h2>{contact.name}</h2>
          <span className={cx('contact-status', `is-${status.key}`)}>{status.label}</span>
          {!contact.unknown && (
            <span className="contact-answer-chance">
              {Math.round(chance * 100)}% answer chance
            </span>
          )}
        </div>
      </div>
      <p className="contact-description">{contact.description}</p>
      <div className="contact-trust">
        <div className="contact-trust-head"><span>Trust</span><strong>{state.trust}/10</strong></div>
        <div className="phone-progress"><i style={{ width: `${state.trust * 10}%` }} /></div>
      </div>
      <div className="contact-stat-grid">
        <div><span>Answered</span><strong>{state.answered}</strong></div>
        <div><span>Missed</span><strong>{state.missed}</strong></div>
        <div><span>Call cost</span><strong>{contact.callCost}%</strong></div>
        <div><span>Protection</span><strong>{protection ? `${protection.shieldSteps} steps` : '—'}</strong></div>
      </div>
      <div className="contact-bonus">
        <span className="eyebrow">Why call them</span>
        <p>{contact.special}</p>
      </div>
      {available.length > 0 && (
        <p className="contact-thread-note">{available.length} new conversation{available.length === 1 ? '' : 's'} possibly available tonight.</p>
      )}
      <button
        className="phone-call-button"
        disabled={contact.unknown && !state.unlocked}
        onClick={() => startCall(contact.id)}
      >
        <span>☎</span>
        {contact.unknown && !state.unlocked ? 'No signal' : 'Call'}
      </button>
    </div>
  );
}

function ContactsScreen() {
  const game = useGameStore((state) => state.game);
  const selectedContactId = useGameStore((state) => state.selectedContactId);
  const selectContact = useGameStore((state) => state.selectContact);
  if (!game) return null;
  const selected = selectedContactId ? contactById[selectedContactId] : null;
  if (selected) return <ContactDetail contact={selected} />;
  return (
    <div className="phone-page contacts-page">
      <div className="phone-page-head">
        <span className="eyebrow">The people who might answer</span>
        <h2>Contacts</h2>
      </div>
      <div className="contact-list">
        {contacts.map((contact) => (
          <ContactRow key={contact.id} contact={contact} onClick={() => selectContact(contact.id)} />
        ))}
      </div>
      <p className="phone-footnote">Calls cost battery and time. A voice keeps the road from closing.</p>
    </div>
  );
}

function MessagesScreen() {
  const game = useGameStore((state) => state.game);
  const readMessage = useGameStore((state) => state.readMessage);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!game) return null;
  const delivered = game.deliveredMessages
    .map((id) => messageById[id])
    .filter((message) => Boolean(message))
    .filter((message) => !message.requiresFlag || Boolean(game.flags[message.requiresFlag]))
    .sort((a, b) => b.at - a.at);
  const open = openId ? messageById[openId] : null;

  if (open) {
    return (
      <div className="phone-page message-thread">
        <button className="phone-back" onClick={() => setOpenId(null)}>← Messages</button>
        <div className="message-thread-head">
          <span className="eyebrow">{formatNightTime(open.at)}</span>
          <h2>{open.from}</h2>
        </div>
        <div className="message-bubble incoming">{open.text}</div>
        {open.effects?.some((effect) => effect.type === 'clue') && (
          <p className="message-clue">This message added something to your notes.</p>
        )}
        <p className="phone-footnote">Read messages do not cost battery. Opening one may reveal a clue.</p>
      </div>
    );
  }

  return (
    <div className="phone-page messages-page">
      <div className="phone-page-head">
        <span className="eyebrow">What reached the phone</span>
        <h2>Messages</h2>
      </div>
      <div className="message-list">
        {delivered.map((message) => {
          const unread = !game.readMessages.includes(message.id);
          return (
            <button
              key={message.id}
              className={cx('message-row', unread && 'unread')}
              onClick={() => {
                setOpenId(message.id);
                readMessage(message.id);
              }}
            >
              <span className={cx('message-avatar', message.contactId === 'system' && 'system')}>
                {message.contactId === 'system' ? '◇' : (contactById[message.contactId]?.shortName?.[0] ?? '?')}
              </span>
              <span className="message-row-mid">
                <strong>{message.from}</strong>
                <p>{message.text.length > 84 ? `${message.text.slice(0, 84)}…` : message.text}</p>
              </span>
              <span className="message-row-right">
                <small>{formatNightTime(message.at)}</small>
                {unread && <i />}
              </span>
            </button>
          );
        })}
        {!delivered.length && <p className="phone-empty">No messages. Silence is not the same as safety.</p>}
      </div>
    </div>
  );
}

function HistoryScreen() {
  const game = useGameStore((state) => state.game);
  if (!game) return null;
  return (
    <div className="phone-page history-page">
      <div className="phone-page-head">
        <span className="eyebrow">Every connection leaves a mark</span>
        <h2>Call History</h2>
      </div>
      <div className="history-list">
        {game.callHistory.map((entry) => (
          <div key={entry.id} className={cx('history-row', `type-${entry.type}`)}>
            <span className="history-icon">
              {entry.type === 'missed' ? '↙' : entry.type === 'voicemail' ? '▤' : entry.type === 'incoming' ? '↘' : '↗'}
            </span>
            <div>
              <strong>{entry.name}</strong>
              <span>{entry.type} · {formatNightTime(entry.at)}</span>
            </div>
            <small>{entry.note ?? (entry.type === 'missed' ? 'No answer' : 'Connected')}</small>
          </div>
        ))}
        {!game.callHistory.length && <p className="phone-empty">No calls yet. The street is listening.</p>}
      </div>
    </div>
  );
}

function CallScreen() {
  const game = useGameStore((state) => state.game);
  const runtime = useGameStore((state) => state.activeCall);
  const advance = useGameStore((state) => state.advanceCall);
  const choose = useGameStore((state) => state.chooseCallChoice);
  const hangUp = useGameStore((state) => state.hangUpCall);
  const showTimers = useGameStore((state) => state.settings.showTimers);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!game || !runtime) return null;
  const contact = contactById[runtime.contactId];
  const call = runtime.callId ? callById[runtime.callId] : null;
  const node = call?.nodes[runtime.nodeId];
  const seconds = Math.max(0, Math.floor((now - runtime.startedAt) / 1000));
  const ringing = !runtime.answered;
  const quality = callSignalQuality(game);

  if (ringing) {
    return (
      <div className="call-screen ringing">
        <div className="call-ring-halo a" />
        <div className="call-ring-halo b" />
        <Portrait portrait={contact.portrait} size="lg" />
        <p className="eyebrow">Calling</p>
        <h2>{contact.name}</h2>
        <p className="call-status">The line is trying to find them…</p>
        <SignalBars quality={quality} />
        <div className="call-actions">
          <button className="call-end" onClick={hangUp}><span>×</span> End</button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="call-screen">
        <div className="call-head">
          <Portrait portrait={contact.portrait} size="sm" />
          <div><h2>{contact.shortName}</h2><span>Connected</span></div>
          {showTimers && (
            <span className="call-timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
          )}
        </div>
        <div className="call-transcript"><p className="call-line system">The line is breaking up.</p></div>
        <button className="call-end" onClick={hangUp}>End call</button>
      </div>
    );
  }

  return (
    <div className="call-screen connected">
      <div className="call-head">
        <Portrait portrait={contact.portrait} size="sm" />
        <div>
          <h2>{contact.shortName}</h2>
          <span>{call?.title}</span>
        </div>
        <div className="call-meta">
          <SignalBars quality={quality} />
          {showTimers && (
            <span className="call-timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
          )}
        </div>
      </div>
      <div className="call-transcript">
        <div className={cx('call-line', node.speaker === 'Narrator' && 'system')}>
          <span className="call-speaker">{node.speaker}</span>
          <p>{node.text}</p>
        </div>
        {node.choices?.length ? (
          <div className="call-choices">
            {node.choices.map((choice) => (
              <button key={choice.id} className="call-choice" onClick={() => choose(choice.id)}>
                <span>{choice.text}</span>
                {choice.tag && <small>{choice.tag}</small>}
              </button>
            ))}
          </div>
        ) : (
          <button className="call-continue" onClick={advance}>
            {node.next ? 'Continue' : 'End call'}
            <span>→</span>
          </button>
        )}
      </div>
      <div className="call-footer">
        <span>The connection is holding.</span>
        <button className="call-end small" onClick={hangUp}>Hang up</button>
      </div>
    </div>
  );
}

export function PhoneUI() {
  const phoneTab = useGameStore((state) => state.phoneTab);
  const setPhoneTab = useGameStore((state) => state.setPhoneTab);
  const closePhone = useGameStore((state) => state.closePhone);
  const game = useGameStore((state) => state.game);
  const activeCall = useGameStore((state) => state.activeCall);
  const showTimers = useGameStore((state) => state.settings.showTimers);
  if (!game) return null;
  const lowBattery = game.battery <= 20;
  const stage = stageInfo(game.threat);

  return (
    <div className={cx('phone-overlay', lowBattery && 'battery-low', criticalThreat(game.threat) && 'threat-high')}>
      <div className="phone-bezel">
        <div className="phone-notch"><i /><i /></div>
        <div className="phone-screen">
          <div className="phone-wallpaper-tint" />
          <StatusBar />
          <div className={cx('phone-body', activeCall && 'in-call')}>
            {activeCall ? (
              <CallScreen />
            ) : (
              <>
                {phoneTab === 'home' && <HomeScreen />}
                {phoneTab === 'contacts' && <ContactsScreen />}
                {phoneTab === 'messages' && <MessagesScreen />}
                {phoneTab === 'history' && <HistoryScreen />}
              </>
            )}
          </div>
          {!activeCall && (
            <>
              <PhoneNav current={phoneTab} onChange={setPhoneTab} />
              <button className="phone-close" onClick={closePhone} aria-label="Close phone">×</button>
            </>
          )}
          <div className={cx('phone-threat-foot', `stage-${stage.stage}`)}>
            <span>{stage.label}</span>
            <span>
              {activeCall?.answered
                ? 'live connection · line protected'
                : game.shieldSteps > 0
                  ? `line holds ${game.shieldSteps} steps`
                  : game.shieldSeconds > 0
                    ? showTimers
                      ? `line protected ${Math.ceil(game.shieldSeconds)}s`
                      : 'line protected'
                    : 'line unprotected'}
            </span>
          </div>
        </div>
      </div>
      <div className="phone-overlay-hint">Tab or Esc to close</div>
    </div>
  );
}
