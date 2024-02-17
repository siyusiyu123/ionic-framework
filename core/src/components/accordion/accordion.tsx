import type { ComponentInterface } from '@stencil/core';
import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';
import { addEventListener, getElementRoot, raf, removeEventListener, transitionEndAsync } from '@utils/helpers';
import { chevronDown } from 'ionicons/icons';

import { config } from '../../global/config';
import { getIonTheme } from '../../global/ionic-global';

const enum AccordionState {
  Collapsed = 1 << 0,
  Collapsing = 1 << 1,
  Expanded = 1 << 2,
  Expanding = 1 << 3,
}

/**
 * @virtualProp {"ios" | "md"} mode - The mode determines which platform styles to use.
 *
 * @slot header - Content is placed at the top and is used to
 * expand or collapse the accordion item.
 * @slot content - Content is placed below the header and is
 * shown or hidden based on expanded state.
 *
 * @part header - The wrapper element for the header slot.
 * @part content - The wrapper element for the content slot.
 * @part expanded - The expanded element. Can be used in combination
 * with the `header` and `content` parts (i.e. `::part(header expanded)`).
 */
@Component({
  tag: 'ion-accordion',
  styleUrls: {
    ios: 'accordion.ios.scss',
    md: 'accordion.md.scss',
    ionic: 'accordion.md.scss',
  },
  shadow: {
    delegatesFocus: true,
  },
})
export class Accordion implements ComponentInterface {
  private accordionGroupEl?: HTMLIonAccordionGroupElement | null;
  private updateListener = () => this.updateState(false);
  private contentEl: HTMLDivElement | undefined;
  private contentElWrapper: HTMLDivElement | undefined;
  private headerEl: HTMLDivElement | undefined;

  private currentRaf: number | undefined;

  @Element() el?: HTMLElement;

  @State() state: AccordionState = AccordionState.Collapsed;
  @State() isNext = false;
  @State() isPrevious = false;

  /**
   * The value of the accordion. Defaults to an autogenerated
   * value.
   */
  @Prop() value = `ion-accordion-${accordionIds++}`;
  @Watch('value')
  valueChanged() {
    this.updateState();
  }

  /**
   * If `true`, the accordion cannot be interacted with.
   */
  @Prop() disabled = false;

  /**
   * If `true`, the accordion cannot be interacted with,
   * but does not alter the opacity.
   */
  @Prop() readonly = false;

  /**
   * The toggle icon to use. This icon will be
   * rotated when the accordion is expanded
   * or collapsed.
   */
  @Prop() toggleIcon = chevronDown;

  /**
   * The slot inside of `ion-item` to
   * place the toggle icon. Defaults to `"end"`.
   */
  @Prop() toggleIconSlot: 'start' | 'end' = 'end';

  connectedCallback() {
    const accordionGroupEl = (this.accordionGroupEl = this.el?.closest('ion-accordion-group'));
    if (accordionGroupEl) {
      this.updateState(true);
      addEventListener(accordionGroupEl, 'ionValueChange', this.updateListener);
    }
  }

  disconnectedCallback() {
    const accordionGroupEl = this.accordionGroupEl;
    if (accordionGroupEl) {
      removeEventListener(accordionGroupEl, 'ionValueChange', this.updateListener);
    }
  }

  componentDidLoad() {
    this.setItemDefaults();
    this.slotToggleIcon();

    /**
     * We need to wait a tick because we
     * just set ionItem.button = true and
     * the button has not have been rendered yet.
     */
    raf(() => {
      /**
       * Set aria label on button inside of ion-item
       * once the inner content has been rendered.
       */
      const expanded = this.state === AccordionState.Expanded || this.state === AccordionState.Expanding;
      this.setAria(expanded);
    });
  }

  private setItemDefaults = () => {
    const ionItem = this.getSlottedHeaderIonItem();
    if (!ionItem) {
      return;
    }

    /**
     * For a11y purposes, we make
     * the ion-item a button so users
     * can tab to it and use keyboard
     * navigation to get around.
     */
    ionItem.button = true;
    ionItem.detail = false;

    /**
     * By default, the lines in an
     * item should be full here, but
     * only do that if a user has
     * not explicitly overridden them
     */
    if (ionItem.lines === undefined) {
      ionItem.lines = 'full';
    }
  };

  private getSlottedHeaderIonItem = () => {
    const { headerEl } = this;
    if (!headerEl) {
      return;
    }

    /**
     * Get the first ion-item
     * slotted in the header slot
     */
    const slot = headerEl.querySelector('slot');
    if (!slot) {
      return;
    }

    // This is not defined in unit tests
    if (slot.assignedElements === undefined) return;

    return slot.assignedElements().find((el) => el.tagName === 'ION-ITEM') as HTMLIonItemElement | undefined;
  };

  private setAria = (expanded = false) => {
    const ionItem = this.getSlottedHeaderIonItem();
    if (!ionItem) {
      return;
    }

    /**
     * Get the native <button> element inside of
     * ion-item because that is what will be focused
     */
    const root = getElementRoot(ionItem);
    const button = root.querySelector('button');
    if (!button) {
      return;
    }

    button.setAttribute('aria-expanded', `${expanded}`);
  };

  private slotToggleIcon = () => {
    const ionItem = this.getSlottedHeaderIonItem();
    if (!ionItem) {
      return;
    }

    const { toggleIconSlot, toggleIcon } = this;

    /**
     * Check if there already is a toggle icon.
     * If so, do not add another one.
     */
    const existingToggleIcon = ionItem.querySelector('.ion-accordion-toggle-icon');
    if (existingToggleIcon) {
      return;
    }

    const iconEl = document.createElement('ion-icon');
    iconEl.slot = toggleIconSlot;
    iconEl.lazy = false;
    iconEl.classList.add('ion-accordion-toggle-icon');
    iconEl.icon = toggleIcon;
    iconEl.setAttribute('aria-hidden', 'true');

    ionItem.appendChild(iconEl);
  };

  private expandAccordion = (initialUpdate = false) => {
    const { contentEl, contentElWrapper } = this;
    if (initialUpdate || contentEl === undefined || contentElWrapper === undefined) {
      this.state = AccordionState.Expanded;
      return;
    }

    if (this.state === AccordionState.Expanded) {
      return;
    }

    if (this.currentRaf !== undefined) {
      cancelAnimationFrame(this.currentRaf);
    }

    if (this.shouldAnimate()) {
      raf(() => {
        this.state = AccordionState.Expanding;

        this.currentRaf = raf(async () => {
          const contentHeight = contentElWrapper.offsetHeight;
          const waitForTransition = transitionEndAsync(contentEl, 2000);
          contentEl.style.setProperty('max-height', `${contentHeight}px`);

          await waitForTransition;

          this.state = AccordionState.Expanded;
          contentEl.style.removeProperty('max-height');
        });
      });
    } else {
      this.state = AccordionState.Expanded;
    }
  };

  private collapseAccordion = (initialUpdate = false) => {
    const { contentEl } = this;
    if (initialUpdate || contentEl === undefined) {
      this.state = AccordionState.Collapsed;
      return;
    }

    if (this.state === AccordionState.Collapsed) {
      return;
    }

    if (this.currentRaf !== undefined) {
      cancelAnimationFrame(this.currentRaf);
    }

    if (this.shouldAnimate()) {
      this.currentRaf = raf(async () => {
        const contentHeight = contentEl.offsetHeight;
        contentEl.style.setProperty('max-height', `${contentHeight}px`);

        raf(async () => {
          const waitForTransition = transitionEndAsync(contentEl, 2000);

          this.state = AccordionState.Collapsing;

          await waitForTransition;

          this.state = AccordionState.Collapsed;
          contentEl.style.removeProperty('max-height');
        });
      });
    } else {
      this.state = AccordionState.Collapsed;
    }
  };

  /**
   * Helper function to determine if
   * something should animate.
   * If prefers-reduced-motion is set
   * then we should not animate, regardless
   * of what is set in the config.
   */
  private shouldAnimate = () => {
    if (typeof (window as any) === 'undefined') {
      return false;
    }

    const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return false;
    }

    const animated = config.get('animated', true);
    if (!animated) {
      return false;
    }

    if (this.accordionGroupEl && !this.accordionGroupEl.animated) {
      return false;
    }

    return true;
  };

  private updateState = async (initialUpdate = false) => {
    const accordionGroup = this.accordionGroupEl;
    const accordionValue = this.value;

    if (!accordionGroup) {
      return;
    }

    const value = accordionGroup.value;

    const shouldExpand = Array.isArray(value) ? value.includes(accordionValue) : value === accordionValue;

    if (shouldExpand) {
      this.expandAccordion(initialUpdate);
      this.isNext = this.isPrevious = false;
    } else {
      this.collapseAccordion(initialUpdate);

      /**
       * When using popout or inset,
       * the collapsed accordion items
       * may need additional border radius
       * applied. Check to see if the
       * next or previous accordion is selected.
       */
      const nextAccordion = this.getNextSibling();
      const nextAccordionValue = nextAccordion?.value;

      if (nextAccordionValue !== undefined) {
        this.isPrevious = Array.isArray(value) ? value.includes(nextAccordionValue) : value === nextAccordionValue;
      }

      const previousAccordion = this.getPreviousSibling();
      const previousAccordionValue = previousAccordion?.value;

      if (previousAccordionValue !== undefined) {
        this.isNext = Array.isArray(value) ? value.includes(previousAccordionValue) : value === previousAccordionValue;
      }
    }
  };

  private getNextSibling = () => {
    if (!this.el) {
      return;
    }

    const nextSibling = this.el.nextElementSibling;

    if (nextSibling?.tagName !== 'ION-ACCORDION') {
      return;
    }

    return nextSibling as HTMLIonAccordionElement;
  };

  private getPreviousSibling = () => {
    if (!this.el) {
      return;
    }

    const previousSibling = this.el.previousElementSibling;

    if (previousSibling?.tagName !== 'ION-ACCORDION') {
      return;
    }

    return previousSibling as HTMLIonAccordionElement;
  };

  private toggleExpanded() {
    const { accordionGroupEl, disabled, readonly, value, state } = this;

    if (disabled || readonly) return;

    if (accordionGroupEl) {
      /**
       * Because the accordion group may or may
       * not allow multiple accordions open, we
       * need to request the toggling of this
       * accordion and the accordion group will
       * make the decision on whether or not
       * to allow it.
       */
      const expand = state === AccordionState.Collapsed || state === AccordionState.Collapsing;
      accordionGroupEl.requestAccordionToggle(value, expand);
    }
  }

  render() {
    const { disabled, readonly } = this;
    const theme = getIonTheme(this);
    const expanded = this.state === AccordionState.Expanded || this.state === AccordionState.Expanding;
    const headerPart = expanded ? 'header expanded' : 'header';
    const contentPart = expanded ? 'content expanded' : 'content';

    this.setAria(expanded);

    return (
      <Host
        class={{
          [theme]: true,
          'accordion-expanding': this.state === AccordionState.Expanding,
          'accordion-expanded': this.state === AccordionState.Expanded,
          'accordion-collapsing': this.state === AccordionState.Collapsing,
          'accordion-collapsed': this.state === AccordionState.Collapsed,

          'accordion-next': this.isNext,
          'accordion-previous': this.isPrevious,

          'accordion-disabled': disabled,
          'accordion-readonly': readonly,

          'accordion-animated': this.shouldAnimate(),
        }}
      >
        <div
          onClick={() => this.toggleExpanded()}
          id="header"
          part={headerPart}
          aria-controls="content"
          ref={(headerEl) => (this.headerEl = headerEl)}
        >
          <slot name="header"></slot>
        </div>

        <div
          id="content"
          part={contentPart}
          role="region"
          aria-labelledby="header"
          ref={(contentEl) => (this.contentEl = contentEl)}
        >
          <div id="content-wrapper" ref={(contentElWrapper) => (this.contentElWrapper = contentElWrapper)}>
            <slot name="content"></slot>
          </div>
        </div>
      </Host>
    );
  }
}

let accordionIds = 0;
