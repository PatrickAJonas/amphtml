/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as consent from '../../../../src/consent';
import * as utils from '../utils';
import {Action} from '../amp-story-store-service';
import {AmpStory} from '../amp-story';
import {EventType} from '../events';
import {KeyCodes} from '../../../../src/utils/key-codes';
import {LocalizationService} from '../localization';
import {MediaType} from '../media-pool';
import {PageState} from '../amp-story-page';
import {PaginationButtons} from '../pagination-buttons';
import {registerServiceBuilder} from '../../../../src/service';


const NOOP = () => {};


describes.realWin('amp-story', {
  amp: {
    runtimeOn: true,
    extensions: ['amp-story:1.0'],
  },
}, env => {

  let win;
  let element;
  let story;

  /**
   * @param {!Element} container
   * @param {boolean=} opt_active
   * @return {!Element}
   */
  function appendEmptyPage(container, opt_active) {
    const page = document.createElement('amp-story-page');
    page.id = '-empty-page';
    if (opt_active) {
      page.setAttribute('active', true);
    }
    container.appendChild(page);
    return page;
  }

  /**
   * @param {!Element} container
   * @param {number} count
   * @param {Array<string>=} opt_ids
   * @return {!Array<!Element>}
   */
  function createPages(container, count, opt_ids) {
    return Array(count).fill(undefined).map((unused, i) => {
      const page = win.document.createElement('amp-story-page');
      page.id = opt_ids && opt_ids[i] ? opt_ids[i] : `-page-${i}`;
      container.appendChild(page);
      return page;
    });
  }

  /**
   * @param {string} eventType
   * @return {!Event}
   */
  function createEvent(eventType) {
    const eventObj = document.createEventObject ?
      document.createEventObject() : document.createEvent('Events');
    if (eventObj.initEvent) {
      eventObj.initEvent(eventType, true, true);
    }
    return eventObj;
  }

  beforeEach(() => {
    win = env.win;

    element = win.document.createElement('amp-story');
    win.document.body.appendChild(element);

    const localizationService = new LocalizationService(win);
    registerServiceBuilder(win, 'localization', () => localizationService);

    AmpStory.isBrowserSupported = () => true;
    story = new AmpStory(element);
    // TODO(alanorozco): Test active page event triggers once the stubbable
    // `Services` module is part of the amphtml-story repo.
    // sandbox.stub(element.implementation_,
    // 'triggerActiveEventForPage_').callsFake(NOOP);
  });

  afterEach(() => {
    element.remove();
  });

  it('should build with the expected number of pages', () => {
    const pagesCount = 2;
    createPages(story.element, pagesCount, ['cover', 'page-1']);

    return story.layoutCallback()
        .then(() => {
          expect(story.getPageCount()).to.equal(pagesCount);
        });
  });

  it('should activate the first page when built', () => {
    createPages(story.element, 2, ['cover', 'page-1']);

    return story.layoutCallback()
        .then(() => {
          // Getting all the AmpStoryPage objets.
          const pageElements =
              story.element.getElementsByTagName('amp-story-page');
          const pages = Array.from(pageElements).map(el => el.getImpl());

          return Promise.all(pages);
        })
        .then(pages => {
          // Only the first page should be active.
          for (let i = 0; i < pages.length; i++) {
            i === 0 ?
              expect(pages[i].isActive()).to.be.true :
              expect(pages[i].isActive()).to.be.false;
          }
        });
  });

  it('should update the navigation state when built', () => {
    const firstPageId = 'cover';
    const pageCount = 2;
    createPages(story.element, pageCount, [firstPageId, 'page-1']);
    const updateActivePageStub =
        sandbox.stub(story.navigationState_, 'updateActivePage');

    return story.layoutCallback()
        .then(() => {
          expect(updateActivePageStub)
              .to.have.been.calledWith(0, pageCount, firstPageId);
        });
  });

  it('should preload the bookend if navigating to the last page', () => {
    createPages(story.element, 1, ['cover']);

    const buildBookendStub = sandbox.stub(story, 'buildAndPreloadBookend_');
    return story.layoutCallback()
        .then(() => {
          expect(buildBookendStub).to.have.been.calledOnce;
        });
  });

  it('should not preload the bookend if not on the last page', () => {
    createPages(story.element, 2, ['cover']);

    const buildBookendStub = sandbox.stub(story, 'buildAndPreloadBookend_');
    return story.layoutCallback()
        .then(() => {
          expect(buildBookendStub).to.not.have.been.called;
        });
  });

  it('should prerender/load the share menu', () => {
    createPages(story.element, 2);

    const buildShareMenuStub = sandbox.stub(story.shareMenu_, 'build');

    return story.layoutCallback()
        .then(() => {
          expect(buildShareMenuStub).to.have.been.calledOnce;
        });
  });

  it('should not prerender/load the share menu on desktop', () => {
    createPages(story.element, 2);

    story.storeService_.dispatch(Action.TOGGLE_DESKTOP, true);

    const buildShareMenuStub = sandbox.stub(story.shareMenu_, 'build');

    return story.layoutCallback()
        .then(() => {
          expect(buildShareMenuStub).to.not.have.been.called;
        });
  });

  // TODO(#11639): Re-enable this test.
  it.skip('should hide bookend when CLOSE_BOOKEND is triggered', () => {
    const hideBookendStub = sandbox.stub(
        element.implementation_, 'hideBookend_', NOOP);

    appendEmptyPage(element);

    element.build();

    element.dispatchEvent(new Event(EventType.CLOSE_BOOKEND));

    expect(hideBookendStub).to.have.been.calledOnce;
  });

  // TODO(#11639): Re-enable this test.
  it.skip('should return a valid page index', () => {
    const count = 5;

    const pages = createPages(element, count);

    pages.forEach((page, i) => {
      expect(element.implementation_.getPageIndex(page)).to.equal(i);
    });
  });

  // TODO(#11639): Re-enable this test.
  it.skip('should update progress bar when switching pages', () => {
    const impl = element.implementation_;
    const count = 10;
    const index = 2;

    const page = win.document.createElement('div');

    const updateProgressBarStub =
        sandbox.stub(impl.systemLayer_, 'updateProgressBar').callsFake(NOOP);

    appendEmptyPage(element, /* opt_active */ true);

    sandbox.stub(impl, 'getPageCount').returns(count);
    sandbox.stub(impl, 'getPageIndex').withArgs(page).returns(index);

    impl.switchTo_(page);

    // first page is not counted as part of the progress
    expect(updateProgressBarStub).to.have.been.calledWith(index, count - 1);
  });

  // TODO(#11639): Re-enable this test.
  it.skip('should pause/resume pages when switching pages', () => {
    const impl = element.implementation_;
    const pages = createPages(element, 5);
    impl.schedulePause = sandbox.spy();
    impl.scheduleResume = sandbox.spy();

    const oldPage = pages[0];
    const newPage = pages[1];

    element.build();

    return impl.switchTo_(newPage).then(() => {
      expect(impl.schedulePause).to.have.been.calledWith(oldPage);
      expect(impl.scheduleResume).to.have.been.calledWith(newPage);
    });
  });

  // TODO(#11639): Re-enable this test.
  it.skip('should go to next page on right arrow keydown', () => {
    const pages = createPages(element, 5);

    element.build();

    expect(pages[0].hasAttribute('active')).to.be.true;
    expect(pages[1].hasAttribute('active')).to.be.false;

    // Stubbing because we need to assert synchronously
    sandbox.stub(element.implementation_, 'mutateElement').callsFake(
        mutator => {
          mutator();
          return Promise.resolve();
        });

    const eventObj = createEvent('keydown');
    eventObj.keyCode = KeyCodes.RIGHT_ARROW;
    eventObj.which = KeyCodes.RIGHT_ARROW;
    const docEl = win.document.documentElement;
    docEl.dispatchEvent ?
      docEl.dispatchEvent(eventObj) :
      docEl.fireEvent('onkeydown', eventObj);

    expect(pages[0].hasAttribute('active')).to.be.false;
    expect(pages[1].hasAttribute('active')).to.be.true;
  });

  it('lock body when amp-story is initialized', () => {
    story.lockBody_();
    expect(win.document.body.style.getPropertyValue('overflow'))
        .to.be.equal('hidden');
    expect(win.document.documentElement.style.getPropertyValue('overflow'))
        .to.be.equal('hidden');
  });

  it('builds and attaches pagination buttons ', () => {
    const paginationButtonsStub = {
      attach: sandbox.spy(),
      onNavigationStateChange: sandbox.spy(),
    };
    sandbox.stub(PaginationButtons, 'create').returns(paginationButtonsStub);
    story.buildPaginationButtonsForTesting();
    expect(paginationButtonsStub.attach).to.have.been.calledWith(story.element);
  });

  it.skip('toggles `i-amphtml-story-landscape` based on height and width',
      () => {
        story.element.style.width = '11px';
        story.element.style.height = '10px';
        const isDesktopStub = sandbox.stub(story, 'isDesktop_').returns(false);
        story.vsync_ = {
          run: (task, state) => {
            if (task.measure) {
              task.measure(state);
            }
            if (task.mutate) {
              task.mutate(state);
            }
          },
        };
        story.onResize();
        expect(isDesktopStub).to.be.calledOnce;
        expect(story.element.classList.contains('i-amphtml-story-landscape'))
            .to.be.true;
        story.element.style.width = '10px';
        story.element.style.height = '11px';
        story.onResize();
        expect(isDesktopStub).to.be.calledTwice;
        expect(story.element.classList.contains('i-amphtml-story-landscape'))
            .to.be.false;
      });

  it('should update page id in store', () => {
    const firstPageId = 'page-one';
    const pageCount = 2;
    createPages(story.element, pageCount, [firstPageId, 'page-1']);
    const dispatchStub =
        sandbox.stub(story.storeService_, 'dispatch');

    return story.layoutCallback()
        .then(() => {
          expect(dispatchStub).to.have.been.calledWith(Action.CHANGE_PAGE, {
            id: firstPageId,
            index: 0,
          });
        });
  });

  it('should update page id in browser history', () => {
    // Have to stub this because tests run in iframe and you can't write
    // history from another domain (about:srcdoc).
    const replaceStub = sandbox.stub(win.history, 'replaceState');
    const firstPageId = 'page-zero';
    const pageCount = 2;
    createPages(story.element, pageCount, [firstPageId, 'page-1']);

    story.buildCallback();
    return story.layoutCallback()
        .then(() => {
          return expect(replaceStub).to.have.been.calledWith(
              {ampStoryPageId: firstPageId},
              '',
          );
        });
  });

  it('should NOT update page id in browser history if ad', () => {
    // Have to stub this because tests run in iframe and you can't write
    // history from another domain (about:srcdoc)
    const replaceStub = sandbox.stub(win.history, 'replaceState');
    const firstPageId = 'i-amphtml-ad-page-1';
    const pageCount = 2;
    const pages = createPages(story.element, pageCount,
        [firstPageId, 'page-1']);
    const firstPage = pages[0];
    firstPage.setAttribute('ad', '');

    story.buildCallback();
    return story.layoutCallback()
        .then(() => {
          return expect(replaceStub).to.not.have.been.called;
        });
  });

  it('should not set first page to active when rendering paused story', () => {
    sandbox.stub(win.history, 'replaceState');
    createPages(story.element, 2, ['cover', 'page-1']);

    story.storeService_.dispatch(Action.TOGGLE_PAUSED, true);
    story.buildCallback();

    return story.layoutCallback()
        .then(() => {
          expect(story.getPageById('cover').state_)
              .to.equal(PageState.NOT_ACTIVE);
        });
  });

  describe('amp-story consent', () => {
    it('should pause the story if there is a consent', () => {
      sandbox.stub(win.history, 'replaceState');

      const consentEl = win.document.createElement('amp-consent');
      const storyConsentEl = win.document.createElement('amp-story-consent');
      consentEl.appendChild(storyConsentEl);
      element.appendChild(consentEl);

      createPages(story.element, 2, ['cover', 'page-1']);

      // Never resolving consent promise, emulating a user looking at the
      // consent prompt.
      const promise = new Promise(() => {});
      sandbox.stub(consent, 'getConsentPolicyState').returns(promise);

      story.buildCallback();

      const coverEl = element.querySelector('amp-story-page');
      let setStateStub;

      return coverEl.getImpl()
          .then(cover => {
            setStateStub = sandbox.stub(cover, 'setState');
            return story.layoutCallback();
          })
          .then(() => {
            // These assertions ensure we don't spam the page state. We want to
            // avoid a situation where we set the page to active, then paused,
            // which would spam the media pool with expensive operations.
            expect(setStateStub).to.have.been.calledOnce;
            expect(setStateStub.getCall(0))
                .to.have.been.calledWithExactly(PageState.NOT_ACTIVE);
          });
    });

    it('should play the story after the consent is resolved', () => {
      sandbox.stub(win.history, 'replaceState');

      const consentEl = win.document.createElement('amp-consent');
      const storyConsentEl = win.document.createElement('amp-story-consent');
      consentEl.appendChild(storyConsentEl);
      element.appendChild(consentEl);

      createPages(story.element, 2, ['cover', 'page-1']);

      // In a real scenario, promise is resolved when the user accepted or
      // rejected the consent.
      let resolver;
      const promise = new Promise(resolve => {
        resolver = resolve;
      });

      sandbox.stub(consent, 'getConsentPolicyState').returns(promise);

      story.buildCallback();

      const coverEl = element.querySelector('amp-story-page');
      let setStateStub;

      return coverEl.getImpl()
          .then(cover => {
            setStateStub = sandbox.stub(cover, 'setState');
            return story.layoutCallback();
          })
          .then(() => resolver()) // Resolving the consent.
          .then(() => {
            // These assertions ensure we don't spam the page state. We want to
            // avoid a situation where we set the page to active, then paused,
            // then back to active, which would spam the media pool with
            // expensive operations.
            expect(setStateStub).to.have.been.calledTwice;
            expect(setStateStub.getCall(0))
                .to.have.been.calledWithExactly(PageState.NOT_ACTIVE);
            expect(setStateStub.getCall(1))
                .to.have.been.calledWithExactly(PageState.ACTIVE);
          });
    });

    it('should play the story if the consent was already resolved', () => {
      sandbox.stub(win.history, 'replaceState');

      const consentEl = win.document.createElement('amp-consent');
      const storyConsentEl = win.document.createElement('amp-story-consent');
      consentEl.appendChild(storyConsentEl);
      element.appendChild(consentEl);

      createPages(story.element, 2, ['cover', 'page-1']);

      // Returns an already resolved promised: the user already accepted or
      // rejected the consent in a previous session.
      sandbox.stub(consent, 'getConsentPolicyState').resolves();

      story.buildCallback();

      const coverEl = element.querySelector('amp-story-page');
      let setStateStub;

      return coverEl.getImpl()
          .then(cover => {
            setStateStub = sandbox.stub(cover, 'setState');
            return story.layoutCallback();
          })
          .then(() => {
            // These assertions ensure we don't spam the page state. We want to
            // avoid a situation where we set the page to active, then paused,
            // then back to active, which would spam the media pool with
            // expensive operations.
            expect(setStateStub).to.have.been.calledTwice;
            expect(setStateStub.getCall(0))
                .to.have.been.calledWithExactly(PageState.NOT_ACTIVE);
            expect(setStateStub.getCall(1))
                .to.have.been.calledWithExactly(PageState.ACTIVE);
          });
    });
  });

  describe('amp-story continue anyway', () => {
    it('should not display layout', () => {
      AmpStory.isBrowserSupported = () => false;
      story = new AmpStory(element);
      const dispatchStub = sandbox.stub(story.storeService_, 'dispatch');
      createPages(story.element, 2, ['cover', 'page-4']);
      story.buildCallback();
      return story.layoutCallback()
          .then(() => {
            expect(dispatchStub).to.have.been.calledWith(
                Action.TOGGLE_SUPPORTED_BROWSER, false
            );
          });
    });

    it('should display the story after clicking "continue" button', () => {

      AmpStory.isBrowserSupported = () => false;
      story = new AmpStory(element);
      const dispatchStub = sandbox.stub(
          story.unsupportedBrowserLayer_.storeService_, 'dispatch');
      createPages(story.element, 2, ['cover', 'page-1']);

      story.buildCallback();
      //story.layoutCallback();

      //story.unsupportedBrowserLayer_.continueButton_.click();

      return story.layoutCallback()
          .then(() => {
            story.unsupportedBrowserLayer_.continueButton_.click();
          })
          .then(() => {
            expect(dispatchStub).to.have.been.calledWith(
                Action.TOGGLE_SUPPORTED_BROWSER, true
            );
          });
    });
  });


  describe('desktop attributes', () => {
    it('should add next page attribute', () => {
      sandbox.stub(win.history, 'replaceState');
      sandbox.stub(utils, 'setAttributeInMutate').callsFake(
          (el, attr) => el.element.setAttribute(attr, ''));

      const pages = createPages(story.element, 2, ['page-0', 'page-1']);
      const page1 = pages[1];
      story.buildCallback();
      return story.layoutCallback()
          .then(() => {
            expect(page1.hasAttribute('i-amphtml-next-page')).to.be.true;
          });
    });

    it('should add previous page attribute', () => {
      sandbox.stub(win.history, 'replaceState');
      sandbox.stub(story, 'maybePreloadBookend_').returns();
      sandbox.stub(utils, 'setAttributeInMutate').callsFake(
          (el, attr) => el.element.setAttribute(attr, ''));

      const pages = createPages(story.element, 2, ['page-0', 'page-1']);
      const page0 = pages[0];
      story.buildCallback();
      return story.layoutCallback()
          .then(() => story.switchTo_('page-1'))
          .then(() => {
            expect(page0.hasAttribute('i-amphtml-previous-page')).to.be.true;
          });
    });

    it('should add previous visited attribute', () => {
      sandbox.stub(win.history, 'replaceState');
      sandbox.stub(story, 'maybePreloadBookend_').returns();
      sandbox.stub(utils, 'setAttributeInMutate').callsFake(
          (el, attr) => el.element.setAttribute(attr, ''));

      const pages = createPages(story.element, 2, ['page-0', 'page-1']);
      const page0 = pages[0];
      story.buildCallback();
      return story.layoutCallback()
          .then(() => story.switchTo_('page-1'))
          .then(() => {
            expect(page0.hasAttribute('i-amphtml-visited')).to.be.true;
          });
    });
  });

  describe('amp-story audio', () => {
    it('should register and preload the background audio', () => {
      sandbox.stub(win.history, 'replaceState');
      const src = 'https://example.com/foo.mp3';
      story.element.setAttribute('background-audio', src);
      const registerStub = sandbox.stub(story.mediaPool_, 'register');
      const preloadStub = sandbox.stub(story.mediaPool_, 'preload').resolves();

      createPages(story.element, 2, ['cover', 'page-1']);

      story.buildCallback();

      return story.layoutCallback()
          .then(() => {
            expect(story.backgroundAudioEl_).to.exist;
            expect(story.backgroundAudioEl_.src).to.equal(src);
            expect(registerStub).to.have.been.calledOnce;
            expect(preloadStub).to.have.been.calledOnce;
          });
    });

    it('should bless the media on unmute', () => {
      const blessAllStub =
          sandbox.stub(story.mediaPool_, 'blessAll').resolves();

      createPages(story.element, 2, ['cover', 'page-1']);
      story.buildCallback();

      story.storeService_.dispatch(Action.TOGGLE_MUTED, false);

      expect(blessAllStub).to.have.been.calledOnce;
    });

    it('should pause the background audio on ad state if not muted', () => {
      const backgroundAudioEl = win.document.createElement('audio');
      backgroundAudioEl.setAttribute('id', 'foo');
      story.backgroundAudioEl_ = backgroundAudioEl;

      createPages(story.element, 2, ['cover', 'page-1']);
      story.buildCallback();

      const pauseStub = sandbox.stub(story.mediaPool_, 'pause');

      story.storeService_.dispatch(Action.TOGGLE_MUTED, false);
      story.storeService_.dispatch(Action.TOGGLE_AD, true);

      expect(pauseStub).to.have.been.calledOnce;
      expect(pauseStub).to.have.been.calledWith(backgroundAudioEl);
    });

    it('should play the background audio when hiding ad if not muted', () => {
      const backgroundAudioEl = win.document.createElement('audio');
      backgroundAudioEl.setAttribute('id', 'foo');
      story.backgroundAudioEl_ = backgroundAudioEl;

      createPages(story.element, 2, ['cover', 'page-1']);
      story.buildCallback();

      // Displaying an ad and not muted.
      story.storeService_.dispatch(Action.TOGGLE_AD, true);
      story.storeService_.dispatch(Action.TOGGLE_MUTED, false);

      const unmuteStub = sandbox.stub(story.mediaPool_, 'unmute');
      const playStub = sandbox.stub(story.mediaPool_, 'play');

      story.storeService_.dispatch(Action.TOGGLE_AD, false);

      expect(unmuteStub).to.have.been.calledOnce;
      expect(unmuteStub).to.have.been.calledWith(backgroundAudioEl);
      expect(playStub).to.have.been.calledOnce;
      expect(playStub).to.have.been.calledWith(backgroundAudioEl);
    });

    it('should not play the background audio when hiding ad if muted', () => {
      const backgroundAudioEl = win.document.createElement('audio');
      backgroundAudioEl.setAttribute('id', 'foo');
      story.backgroundAudioEl_ = backgroundAudioEl;

      createPages(story.element, 2, ['cover', 'page-1']);
      story.buildCallback();

      story.storeService_.dispatch(Action.TOGGLE_AD, true);

      const unmuteStub = sandbox.stub(story.mediaPool_, 'unmute');
      const playStub = sandbox.stub(story.mediaPool_, 'play');

      story.storeService_.dispatch(Action.TOGGLE_AD, false);

      expect(unmuteStub).not.to.have.been.called;
      expect(playStub).not.to.have.been.called;
    });

    it('should mute the page and unmute the next page upon navigation', () => {
      sandbox.stub(win.history, 'replaceState');
      createPages(story.element, 4, ['cover', 'page-1', 'page-2', 'page-3']);

      story.storeService_.dispatch(Action.TOGGLE_MUTED, false);
      story.buildCallback();

      let coverMuteStub;
      let firstPageUnmuteStub;

      return story.layoutCallback()
          .then(() => {
            coverMuteStub =
                sandbox.stub(story.getPageById('cover'), 'muteAllMedia');
            firstPageUnmuteStub =
                sandbox.stub(story.getPageById('page-1'), 'unmuteAllMedia');
            return story.switchTo_('page-1');
          })
          .then(() => {
            expect(coverMuteStub).to.have.been.calledOnce;
            expect(firstPageUnmuteStub).to.have.been.calledOnce;
          });
    });
  });

  describe('#getMaxMediaElementCounts', () => {
    it('should create 2 audio & video elements when no elements found', () => {
      sandbox.stub(story.element, 'querySelectorAll').returns([]);

      const expected = {
        [MediaType.AUDIO]: 2,
        [MediaType.VIDEO]: 2,
      };
      expect(story.getMaxMediaElementCounts()).to.deep.equal(expected);
    });

    it('should create 2 extra audio & video elements for ads', () => {
      const qsStub = sandbox.stub(story.element, 'querySelectorAll');
      qsStub.withArgs('amp-audio, [background-audio]').returns(['el']);
      qsStub.withArgs('amp-video').returns(['el', 'el']);

      const expected = {
        [MediaType.AUDIO]: 3,
        [MediaType.VIDEO]: 4,
      };
      expect(story.getMaxMediaElementCounts()).to.deep.equal(expected);
    });

    it('never have more than the defined maximums', () => {
      const qsStub = sandbox.stub(story.element, 'querySelectorAll');
      qsStub.withArgs('amp-audio, [background-audio]')
          .returns(['el', 'el', 'el', 'el', 'el', 'el', 'el']);
      qsStub.withArgs('amp-video')
          .returns(['el', 'el', 'el', 'el', 'el', 'el', 'el', 'el']);

      const expected = {
        [MediaType.AUDIO]: 4,
        [MediaType.VIDEO]: 8,
      };
      expect(story.getMaxMediaElementCounts()).to.deep.equal(expected);
    });
  });
});
