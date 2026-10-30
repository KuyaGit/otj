import { CIRCUITS } from './wiring-data';
import { PART, partsFor } from './stage-parts';

describe('diagram parts', () => {
  const circuit = (id: string) => CIRCUITS.find((c) => c.id === id)!;
  const parts = (id: string) => partsFor(circuit(id));
  const stage = (id: string, label: string) => circuit(id).diagram.findIndex((s) => s.label === label);

  it('gives every circuit one entry per box in its diagram', () => {
    for (const c of CIRCUITS) expect(partsFor(c).length).withContext(c.id).toBe(c.diagram.length);
  });

  it('shows the relay on every circuit that has a relay pin table, and the flasher on every flasher one', () => {
    // The starter diagram is the heavy battery-to-starter cable. Its relay only triggers the solenoid
    // and is not in that path, so it appears in the relay pin table instead of as a box.
    const triggerOnly = ['starter'];
    for (const c of CIRCUITS.filter((x) => x.relay && !triggerOnly.includes(x.id))) {
      expect(partsFor(c)).withContext(c.id).toContain(PART.relay);
    }
    for (const c of CIRCUITS.filter((x) => x.flasher)) expect(partsFor(c)).withContext(c.id).toContain(PART.flasher);
  });

  it('sizes a blade fuse from the box label, its note, or the circuit fuse', () => {
    expect(parts('headlight-low')[stage('headlight-low', '20A fuse')]).toBe('20A blade fuse');
    expect(parts('led-accessory-power')[stage('led-accessory-power', 'Fuse')]).toBe('10–15A blade fuse');
    expect(parts('fuel-pump')[stage('fuel-pump', 'Fuse')]).toBe('7.5–20A blade fuse');
    expect(parts('gauges')[stage('gauges', '10A GAUGE fuse')]).toBe('10A blade fuse');
  });

  it('falls back when no size is written anywhere', () => {
    expect(parts('amplifier')[stage('amplifier', 'Dedicated fuse')]).toBe('Blade fuse, sized per the circuit');
  });

  it('names the main feed parts', () => {
    expect(parts('main-feed')[stage('main-feed', 'Main fuse / relay panel')]).toBe(PART.fuseBlock);
    expect(parts('main-feed')[stage('main-feed', 'Main fuse')]).toBe(PART.mainFuse);
    expect(parts('main-feed')[stage('main-feed', 'Relays (high-current loads)')]).toBe(PART.relays);
    expect(parts('charging-system')[stage('charging-system', 'Alternator fuse / fusible link')]).toBe(PART.fusibleLink);
  });

  it('names the signal switches', () => {
    expect(parts('hazard-lights')[stage('hazard-lights', 'Hazard switch')]).toBe(PART.hazardSwitch);
    expect(parts('turn-signals')[stage('turn-signals', 'Turn signal switch')]).toBe(PART.turnSwitch);
  });

  it('leaves out boxes with nothing to buy', () => {
    expect(parts('headlight-low')[stage('headlight-low', 'Battery (+)')]).toBeUndefined();
    expect(parts('headlight-low')[stage('headlight-low', 'Low beam lamps')]).toBeUndefined();
    expect(parts('brake-lights')[stage('brake-lights', 'Brake switch')]).toBeUndefined();
  });
});
