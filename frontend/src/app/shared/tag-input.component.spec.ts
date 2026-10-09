import { TestBed } from '@angular/core/testing';
import { TagInputComponent } from './tag-input.component';

describe('TagInputComponent', () => {
  function setup() {
    const fixture = TestBed.createComponent(TagInputComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const type = (value: string) => {
      input.value = value;
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
    };
    return { fixture, component: fixture.componentInstance, input, type };
  }

  it('adds a trimmed tag on Enter and clears the field', () => {
    const { component, input, type } = setup();
    type('  projet  ');
    expect(component.tags()).toEqual(['projet']);
    expect(input.value).toBe('');
  });

  it('rejects duplicates regardless of case', () => {
    const { component, fixture, type } = setup();
    type('Projet');
    type('projet');
    expect(component.tags()).toEqual(['Projet']);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('déjà ajouté');
  });

  it('rejects tags longer than 30 characters', () => {
    const { component, type } = setup();
    type('x'.repeat(31));
    expect(component.tags()).toEqual([]);
    expect(component.error()).toContain('30');
  });

  it('removes a tag with its remove button', () => {
    const { component, fixture, type } = setup();
    type('a');
    type('b');
    fixture.nativeElement.querySelector('button[aria-label="Retirer le tag a"]').click();
    expect(component.tags()).toEqual(['b']);
  });
});
