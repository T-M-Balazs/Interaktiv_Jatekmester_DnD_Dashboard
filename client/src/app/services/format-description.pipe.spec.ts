import { DomSanitizer } from '@angular/platform-browser';
import { FormatDescriptionPipe, formatDescriptionHtml } from './format-description.pipe';

describe('FormatDescriptionPipe', () => {
  let pipe: FormatDescriptionPipe;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

  beforeEach(() => {
    sanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((val: string) => val);
    pipe = new FormatDescriptionPipe(sanitizerSpy);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should transform plain text into paragraphs', () => {
    const text = 'First line.\n\nSecond line.';
    const result = formatDescriptionHtml(text);
    expect(result).toContain('<p>First line.</p>');
    expect(result).toContain('<p>Second line.</p>');
  });

  it('should parse 5e tags like {@b ...} and {@i ...}', () => {
    const text = '{@b bold text} and {@i italic text}';
    const result = formatDescriptionHtml(text);
    expect(result).toContain('<strong>bold text</strong>');
    expect(result).toContain('<em>italic text</em>');
  });

  it('should render complex spell entries with statblock patterns', () => {
    const rawEntry = `
      ANIMATED OBJECT
      Huge or Smaller Construct, Unaligned
      AC 15
      HP 10 (Medium or smaller), 20 (Large), 40 (Huge)
      Speed 30 ft.
      Immunities Poison, Psychic; Charmed, Exhaustion, Frightened, Paralyzed, Poisoned
      Senses Blindsight 30 ft.; Passive Perception 6
      Languages Understands the languages you know
      CR None
      STR 16 (+3) DEX 10 (+0) CON 10 (+0) INT 3 (-4) WIS 3 (-4) CHA 1 (-5)
      Actions
      Slam. Melee Attack Roll: Bonus equals your spell attack modifier
    `;
    const result = formatDescriptionHtml(rawEntry);
    expect(result).toContain('statblock-card');
    expect(result).toContain('ANIMATED OBJECT');
    expect(result).toContain('AC');
    expect(result).toContain('15');
    expect(result).toContain('sb-abilities-grid');
  });

  it('should convert serialized table format into HTML table', () => {
    const tableText = `type: table, caption: Animated Object Statistics, colLabels: Size
HP
AC
Attack
Str
Dex
rows: animated object (tiny)
20
18
+8 to hit, 1d4 + 4 damage
1d20 - 3
1d20 + 4`;
    const result = formatDescriptionHtml(tableText);
    expect(result).toContain('entry-table');
    expect(result).toContain('Animated Object Statistics');
    expect(result).toContain('<th>Size</th>');
    expect(result).toContain('Animated Object (Tiny)');
  });
    expect(result).toContain('Tiny');
  });
});
