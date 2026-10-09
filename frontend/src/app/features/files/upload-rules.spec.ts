import { durationLabel, fileError } from './upload-rules';

describe('upload rules', () => {
  it('accepts a normal file', () => {
    expect(fileError(new File(['ok'], 'rapport.pdf'))).toBeNull();
  });

  it('rejects empty files and blocked extensions', () => {
    expect(fileError(new File([], 'vide.txt'))).toContain('vide');
    expect(fileError(new File(['x'], 'script.sh'))).toContain('.sh');
  });

  it('labels the retention duration', () => {
    expect(durationLabel(7)).toBe('une semaine');
    expect(durationLabel(1)).toBe('une journée');
  });
});
