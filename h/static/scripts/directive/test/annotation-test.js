/* jshint node: true */
'use strict';

var events = require('../../events');

var module = angular.mock.module;
var inject = angular.mock.inject;

describe('annotation', function() {
  var $compile;
  var $document;
  var $element;
  var $q;
  var $rootScope;
  var $scope;
  var $timeout;
  var $window;
  var annotation;
  var controller;
  var createDirective;
  var fakeAnnotationMapper;
  var fakeAnnotationUI;
  var fakeDocumentDomainFilter;
  var fakeDocumentTitleFilter;
  var fakeDrafts;
  var fakeFeatures;
  var fakeFlash;
  var fakeGroups;
  var fakeMomentFilter;
  var fakePermissions;
  var fakePersonaFilter;
  var fakeSession;
  var fakeStore;
  var fakeTags;
  var fakeTime;
  var fakeUrlEncodeFilter;
  var isolateScope;
  var sandbox;

  createDirective = function() {
    $element = angular.element('<div annotation="annotation">');
    $compile($element)($scope);
    $scope.$digest();
    controller = $element.controller('annotation');
    isolateScope = $element.isolateScope();
  };

  before(function() {
    angular.module('h', [])
      .directive('annotation', require('../annotation').directive);
  });

  beforeEach(module('h'));

  beforeEach(module('h.templates'));

  beforeEach(module(function($provide) {
    sandbox = sinon.sandbox.create();

    fakeAnnotationMapper = {
      createAnnotation: sandbox.stub().returns({
        permissions: {
          read: ['acct:bill@localhost'],
          update: ['acct:bill@localhost'],
          destroy: ['acct:bill@localhost'],
          admin: ['acct:bill@localhost']
        }
      }),
      deleteAnnotation: sandbox.stub()
    };

    fakeAnnotationUI = {};

    fakeDrafts = {
      update: sandbox.stub(),
      remove: sandbox.stub(),
      get: sandbox.stub()
    };

    fakeFeatures = {
      flagEnabled: sandbox.stub().returns(true)
    };

    fakeFlash = sandbox.stub();

    fakeMomentFilter = sandbox.stub().returns('ages ago');

    fakePermissions = {
      isShared: sandbox.stub().returns(true),
      isPrivate: sandbox.stub().returns(false),
      permits: sandbox.stub().returns(true),
      shared: sandbox.stub().returns({
        read: ['everybody']
      }),
      'private': sandbox.stub().returns({
        read: ['justme']
      }),
      'default': sandbox.stub().returns({
        read: ['default']
      }),
      setDefault: sandbox.stub()
    };

    fakePersonaFilter = sandbox.stub().returnsArg(0);

    fakeDocumentTitleFilter = function(arg) {
      return '';
    };

    fakeDocumentDomainFilter = function(arg) {
      return '';
    };

    fakeSession = {
      state: {
        userid: 'acct:bill@localhost'
      }
    };

    fakeTags = {
      filter: sandbox.stub().returns('a while ago'),
      store: sandbox.stub()
    };

    fakeTime = {
      toFuzzyString: sandbox.stub().returns('a while ago'),
      nextFuzzyUpdate: sandbox.stub().returns(30)
    };

    fakeUrlEncodeFilter = function(v) {
      return encodeURIComponent(v);
    };

    fakeGroups = {
      focused: function() {
        return {};
      },
      get: function() {}
    };

    $provide.value('annotationMapper', fakeAnnotationMapper);
    $provide.value('annotationUI', fakeAnnotationUI);
    $provide.value('drafts', fakeDrafts);
    $provide.value('features', fakeFeatures);
    $provide.value('flash', fakeFlash);
    $provide.value('momentFilter', fakeMomentFilter);
    $provide.value('permissions', fakePermissions);
    $provide.value('personaFilter', fakePersonaFilter);
    $provide.value('documentTitleFilter', fakeDocumentTitleFilter);
    $provide.value('documentDomainFilter', fakeDocumentDomainFilter);
    $provide.value('session', fakeSession);
    $provide.value('store', fakeStore);
    $provide.value('tags', fakeTags);
    $provide.value('time', fakeTime);
    $provide.value('urlencodeFilter', fakeUrlEncodeFilter);
    $provide.value('groups', fakeGroups);
  }));

  beforeEach(
    inject(
      function(_$compile_, _$document_, _$q_, _$rootScope_, _$timeout_,
               _$window_) {
        $compile = _$compile_;
        $document = _$document_;
        $window = _$window_;
        $q = _$q_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $scope.annotation = annotation = {
          id: 'deadbeef',
          document: {
            title: 'A special document'
          },
          target: [{}],
          uri: 'http://example.com',
          user: 'acct:bill@localhost'
        };
      }
    )
  );

  afterEach(function() {
    sandbox.restore();
  });

  describe('when the annotation is a highlight', function() {
    beforeEach(function() {
      annotation.$highlight = true;
      annotation.$create = sinon.stub().returns({
        then: angular.noop,
        'catch': angular.noop,
        'finally': angular.noop
      });
    });

    it('persists upon login', function() {
      delete annotation.id;
      delete annotation.user;
      fakeSession.state.userid = null;
      createDirective();
      $scope.$digest();
      assert.notCalled(annotation.$create);
      fakeSession.state.userid = 'acct:ted@wyldstallyns.com';
      $scope.$broadcast(events.USER_CHANGED, {});
      $scope.$digest();
      assert.calledOnce(annotation.$create);
    });

    it('is private', function() {
      delete annotation.id;
      createDirective();
      $scope.$digest();
      assert.deepEqual(annotation.permissions, {
        read: ['justme']
      });
    });
  });

  describe('#reply', function() {
    var container;

    beforeEach(function() {
      createDirective();
      annotation.permissions = {
        read: ['acct:joe@localhost'],
        update: ['acct:joe@localhost'],
        destroy: ['acct:joe@localhost'],
        admin: ['acct:joe@localhost']
      };
    });

    it('creates a new reply with the proper uri and references', function() {
      var match;
      controller.reply();
      match = sinon.match({
        references: [annotation.id],
        uri: annotation.uri
      });
      assert.calledWith(fakeAnnotationMapper.createAnnotation, match);
    });

    it('makes the annotation shared if the parent is shared', function() {
      var reply;
      reply = {};
      fakeAnnotationMapper.createAnnotation.returns(reply);
      fakePermissions.isShared.returns(true);
      controller.reply();
      assert.deepEqual(reply.permissions, {
        read: ['everybody']
      });
    });

    it('makes the annotation shared if the parent is shared', function() {
      var reply;
      $scope.annotation.group = 'my group';
      $scope.annotation.permissions = {
        read: ['my group']
      };
      reply = {};
      fakeAnnotationMapper.createAnnotation.returns(reply);
      fakePermissions.isShared = function(permissions, group) {
        return permissions.read.indexOf(group) !== -1;
      };
      fakePermissions.shared = function(group) {
        return {
          read: [group]
        };
      };
      controller.reply();
      assert(reply.permissions.read.indexOf('my group') !== -1);
    });

    it(
      'does not add the world readable principal if the parent is private',
      function() {
        var reply;
        reply = {};
        fakeAnnotationMapper.createAnnotation.returns(reply);
        fakePermissions.isShared.returns(false);
        controller.reply();
        assert.deepEqual(reply.permissions, {
          read: ['justme']
        });
      }
    );

    it('sets the reply\'s group to be the same as its parent\'s', function() {
      var reply;
      $scope.annotation.group = 'my group';
      reply = {};
      fakeAnnotationMapper.createAnnotation.returns(reply);
      controller.reply();
      assert.equal(reply.group, $scope.annotation.group);
    });
  });

  describe('#setPrivacy', function() {
    beforeEach(function() {
      createDirective();
    });

    it('makes the annotation private when level is "private"', function() {
      annotation.$update = sinon.stub().returns(Promise.resolve());
      controller.edit();
      controller.setPrivacy('private');
      return controller.save().then(function() {
        assert.deepEqual(annotation.permissions, {
          read: ['justme']
        });
      });
    });

    it('makes the annotation shared when level is "shared"', function() {
      annotation.$update = sinon.stub().returns(Promise.resolve());
      controller.edit();
      controller.setPrivacy('shared');
      return controller.save().then(function() {
        assert.deepEqual(annotation.permissions, {
          read: ['everybody']
        });
      });
    });

    it('saves the "shared" visibility level to localStorage', function() {
      annotation.$update = sinon.stub().returns(Promise.resolve());
      controller.edit();
      controller.setPrivacy('shared');
      return controller.save().then(function() {
        assert(fakePermissions.setDefault.calledWithExactly('shared'));
      });
    });

    it('saves the "private" visibility level to localStorage', function() {
      annotation.$update = sinon.stub().returns(Promise.resolve());
      controller.edit();
      controller.setPrivacy('private');
      return controller.save().then(function() {
        assert(fakePermissions.setDefault.calledWithExactly('private'));
      });
    });

    it('doesn\'t save the visibility if the annotation is a reply', function() {
      annotation.$update = sinon.stub().returns(Promise.resolve());
      annotation.references = ['parent id'];
      controller.edit();
      controller.setPrivacy('private');
      return controller.save().then(function() {
        assert(!fakePermissions.setDefault.called);
      });
    });
  });

  describe('#hasContent', function() {
    beforeEach(function() {
      createDirective();
    });

    it('returns false if the annotation has no tags or text', function() {
      controller.annotation.text = '';
      controller.annotation.tags = [];
      assert.ok(!controller.hasContent());
    });

    it('returns true if the annotation has tags or text', function() {
      controller.annotation.text = 'bar';
      assert.ok(controller.hasContent());
      controller.annotation.text = '';
      controller.annotation.tags = [
        {
          text: 'foo'
        }
      ];
      assert.ok(controller.hasContent());
    });
  });

  describe('#hasQuotes', function() {
    beforeEach(function() {
      createDirective();
    });

    it('returns false if the annotation has no quotes', function() {
      controller.annotation.target = [{}];
      assert.isFalse(controller.hasQuotes());
    });

    it('returns true if the annotation has quotes', function() {
      controller.annotation.target = [
        {
          selector: [
            {
              type: 'TextQuoteSelector'
            }
          ]
        }
      ];
      assert.isTrue(controller.hasQuotes());
    });
  });

  describe('#render', function() {
    beforeEach(function() {
      createDirective();
      sandbox.spy(controller, 'render');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('is called exactly once on model changes', function() {
      assert.notCalled(controller.render);
      annotation['delete'] = true;
      $scope.$digest();
      assert.calledOnce(controller.render);
      annotation.booz = 'baz';
      $scope.$digest();
      assert.calledTwice(controller.render);
    });

    it('provides a document title', function() {
      controller.render();
      assert.equal(controller.document.title, 'A special document');
    });

    it('uses the first title when there are more than one', function() {
      annotation.document.title = ['first title', 'second title'];
      controller.render();
      assert.equal(controller.document.title, 'first title');
    });

    it('truncates long titles', function() {
      annotation.document.title = 'A very very very long title that really\nshouldn\'t be found on a page on the internet.';
      controller.render();
      assert.equal(
        controller.document.title, 'A very very very long title th…');
    });

    it('provides a document uri', function() {
      controller.render();
      assert.equal(controller.document.uri, 'http://example.com');
    });

    it('provides an extracted domain from the uri', function() {
      controller.render();
      assert.equal(controller.document.domain, 'example.com');
    });

    it('uses the domain for the title if the title is not present', function() {
      delete annotation.document.title;
      controller.render();
      assert.equal(controller.document.title, 'example.com');
    });

    it(
      'still sets the uri correctly if the annotation has no document',
      function() {
        delete annotation.document;
        controller.render();
        assert(controller.document.uri === $scope.annotation.uri);
      }
    );

    it(
      'still sets the domain correctly if the annotation has no document',
      function() {
        delete annotation.document;
        controller.render();
        assert(controller.document.domain === 'example.com');
      }
    );

    it(
      'uses the domain for the title when the annotation has no document',
      function() {
        delete annotation.document;
        controller.render();
        assert(controller.document.title === 'example.com');
      }
    );

    describe('timestamp', function() {
      var clock;

      beforeEach(function() {
        clock = sinon.useFakeTimers();
        annotation.created = (new Date()).toString();
        annotation.updated = (new Date()).toString();
      });

      afterEach(function() {
        clock.restore();
      });

      it('is not updated for unsaved annotations', function() {
        annotation.updated = null;
        $scope.$digest();
        assert.equal(controller.timestamp, null);
      });

      it('is updated on first digest', function() {
        $scope.$digest();
        assert.equal(controller.timestamp, 'a while ago');
      });

      it('is updated after a timeout', function() {
        fakeTime.nextFuzzyUpdate.returns(10);
        fakeTime.toFuzzyString.returns('ages ago');
        $scope.$digest();
        clock.tick(11000);
        $timeout.flush();
        assert.equal(controller.timestamp, 'ages ago');
      });

      it('is no longer updated after the scope is destroyed', function() {
        $scope.$digest();
        $scope.$destroy();
        $timeout.flush();
        $timeout.verifyNoPendingTasks();
      });
    });

    describe('share', function() {
      var dialog;

      beforeEach(function() {
        dialog = $element.find('.share-dialog-wrapper');
      });

      it('sets and unsets the open class on the share wrapper', function() {
        dialog.find('button').click();
        isolateScope.$digest();
        assert.ok(dialog.hasClass('open'));
        $document.click();
        assert.notOk(dialog.hasClass('open'));
      });
    });
  });

  describe('deleteAnnotation() method', function() {
    beforeEach(function() {
      createDirective();
      fakeAnnotationMapper.deleteAnnotation = sandbox.stub();
      fakeFlash.error = sandbox.stub();
    });

    it(
      'calls annotationMapper.delete() if the delete is confirmed',
      function(done) {
        sandbox.stub($window, 'confirm').returns(true);
        fakeAnnotationMapper.deleteAnnotation.returns($q.resolve());
        controller['delete']().then(function() {
          assert(fakeAnnotationMapper.deleteAnnotation.calledWith(annotation));
          done();
        });
        $timeout.flush();
      }
    );

    it(
      'doesn\'t call annotationMapper.delete() if the delete is cancelled',
      function() {
        sandbox.stub($window, 'confirm').returns(false);
        assert(fakeAnnotationMapper.deleteAnnotation.notCalled);
      }
    );

    it(
      'flashes a generic error if the server cannot be reached',
      function(done) {
        sandbox.stub($window, 'confirm').returns(true);
        fakeAnnotationMapper.deleteAnnotation.returns($q.reject({
          status: 0
        }));
        controller['delete']().then(function() {
          assert(fakeFlash.error.calledWith(
            'Service unreachable.', 'Deleting annotation failed'));
          done();
        });
        $timeout.flush();
      }
    );

    it('flashes an error if the delete fails on the server', function(done) {
      sandbox.stub($window, 'confirm').returns(true);
      fakeAnnotationMapper.deleteAnnotation.returns($q.reject({
        status: 500,
        statusText: 'Server Error',
        data: {}
      }));
      controller['delete']().then(function() {
        assert(fakeFlash.error.calledWith(
          '500 Server Error', 'Deleting annotation failed'));
        done();
      });
      $timeout.flush();
    });

    it('doesn\'t flash an error if the delete succeeds', function(done) {
      sandbox.stub($window, 'confirm').returns(true);
      fakeAnnotationMapper.deleteAnnotation.returns($q.resolve());
      controller['delete']().then(function() {
        assert(fakeFlash.error.notCalled);
        done();
      });
      $timeout.flush();
    });
  });

  describe('saving a new annotation', function() {
    beforeEach(function() {
      createDirective();
      fakeFlash.error = sandbox.stub();
      controller.action = 'create';
      annotation.$create = sandbox.stub();
    });

    it(
      'emits annotationCreated when saving an annotation succeeds',
      function(done) {
        sandbox.spy($rootScope, '$emit');
        annotation.$create.returns(Promise.resolve());
        controller.save().then(function() {
          assert($rootScope.$emit.calledWith('annotationCreated'));
          done();
        });
      }
    );

    it(
      'flashes a generic error if the server can\'t be reached',
      function(done) {
        annotation.$create.returns(Promise.reject({
          status: 0
        }));
        controller.save().then(function() {
          assert(fakeFlash.error.calledWith(
            'Service unreachable.', 'Saving annotation failed'));
          done();
        });
        $timeout.flush();
      }
    );

    it(
      'flashes an error if saving the annotation fails on the server',
      function(done) {
        annotation.$create.returns(Promise.reject({
          status: 500,
          statusText: 'Server Error',
          data: {}
        }));
        controller.save().then(function() {
          assert(fakeFlash.error.calledWith(
            '500 Server Error', 'Saving annotation failed'));
          done();
        });
      }
    );

    it(
      'doesn\'t flash an error when saving an annotation succeeds',
      function() {
        annotation.$create.returns(Promise.resolve());
        controller.save();
        assert(fakeFlash.error.notCalled);
      }
    );
  });

  describe('saving an edited an annotation', function() {
    beforeEach(function() {
      createDirective();
      fakeFlash.error = sandbox.stub();
      controller.action = 'edit';
      annotation.$update = sandbox.stub();
    });

    it(
      'flashes a generic error if the server cannot be reached',
      function(done) {
        annotation.$update.returns(Promise.reject({
          status: 0
        }));
        controller.save().then(function() {
          assert(fakeFlash.error.calledWith(
            'Service unreachable.', 'Saving annotation failed'));
          done();
        });
      }
    );

    it(
      'flashes an error if saving the annotation fails on the server',
      function(done) {
        annotation.$update.returns(Promise.reject({
          status: 500,
          statusText: 'Server Error',
          data: {}
        }));
        controller.save().then(function() {
          assert(fakeFlash.error.calledWith(
            '500 Server Error', 'Saving annotation failed'));
          done();
        });
      }
    );

    it(
      'doesn\'t flash an error if saving the annotation succeeds',
      function() {
        annotation.$update.returns(Promise.resolve());
        controller.save();
        assert(fakeFlash.error.notCalled);
      }
    );
  });

  describe('drafts', function() {
    it('creates a draft when editing an annotation', function() {
      createDirective();
      controller.edit();
      assert.calledWith(fakeDrafts.update, annotation, {
        text: annotation.text,
        tags: annotation.tags,
        permissions: annotation.permissions
      });
    });

    it('starts editing immediately if there is a draft', function() {
      fakeDrafts.get.returns({
        tags: [
          {
            text: 'unsaved'
          }
        ],
        text: 'unsaved-text'
      });
      createDirective();
      assert.isTrue(controller.editing);
    });

    it('uses the text and tags from the draft if present', function() {
      fakeDrafts.get.returns({
        tags: ['unsaved-tag'],
        text: 'unsaved-text'
      });
      createDirective();
      assert.deepEqual(controller.annotation.tags, [
        {
          text: 'unsaved-tag'
        }
      ]);
      assert.equal(controller.annotation.text, 'unsaved-text');
    });

    it('removes the draft when changes are discarded', function() {
      createDirective();
      controller.edit();
      controller.revert();
      assert.calledWith(fakeDrafts.remove, annotation);
    });

    it('removes the draft when changes are saved', function() {
      annotation.$update = sandbox.stub().returns(Promise.resolve());
      createDirective();
      controller.edit();
      controller.save();
      annotation.updated = (new Date()).toISOString();
      $scope.$digest();
      assert.calledWith(fakeDrafts.remove, annotation);
    });
  });

  describe('when the focused group changes', function() {
    it('updates the current draft', function() {
      createDirective();
      controller.edit();
      controller.annotation.text = 'unsaved-text';
      controller.annotation.tags = [];
      controller.annotation.permissions = 'new permissions';
      fakeDrafts.get = sinon.stub().returns({
        text: 'old-draft'
      });
      fakeDrafts.update = sinon.stub();
      $rootScope.$broadcast(events.GROUP_FOCUSED);
      assert.calledWith(fakeDrafts.update, annotation, {
        text: 'unsaved-text',
        tags: [],
        permissions: 'new permissions'
      });
    });

    it('should not create a new draft', function() {
      createDirective();
      controller.edit();
      fakeDrafts.update = sinon.stub();
      fakeDrafts.get = sinon.stub().returns(null);
      $rootScope.$broadcast(events.GROUP_FOCUSED);
      assert.notCalled(fakeDrafts.update);
    });

    it('moves new annotations to the focused group', function() {
      annotation.id = null;
      createDirective();
      fakeGroups.focused = sinon.stub().returns({
        id: 'new-group'
      });
      $rootScope.$broadcast(events.GROUP_FOCUSED);
      assert.equal(annotation.group, 'new-group');
    });
  });

  it(
    'updates perms when moving new annotations to the focused group',
    function() {
      annotation.id = null;
      annotation.group = 'old-group';
      annotation.permissions = {
        read: [annotation.group]
      };
      fakePermissions.isShared.returns(true);
      createDirective();
      fakePermissions.shared = function(groupId) {
        return {
          read: [groupId]
        };
      };
      fakeGroups.focused = sinon.stub().returns({
        id: 'new-group'
      });
      $rootScope.$broadcast(events.GROUP_FOCUSED);
      assert.deepEqual(annotation.permissions.read, ['new-group']);
    }
  );

  it('saves shared permissions for the new group to drafts', function() {
    annotation.id = null;
    annotation.group = 'old-group';
    annotation.permissions = {
      read: [annotation.group]
    };
    fakePermissions.isShared.returns(true);
    createDirective();
    fakeDrafts.get.returns(true);
    fakePermissions.shared = function(groupId) {
      return {
        read: [groupId]
      };
    };
    fakeGroups.focused = sinon.stub().returns({
      id: 'new-group'
    });
    $rootScope.$broadcast(events.GROUP_FOCUSED);
    assert.deepEqual(
      fakeDrafts.update.lastCall.args[1].permissions.read,
      ['new-group'],
      'Shared permissions for the new group should be saved to drafts');
  });

  it('does not change perms when moving new private annotations', function() {
    annotation.id = null;
    annotation.group = 'old-group';
    annotation.permissions = {
      read: ['acct:bill@localhost']
    };
    createDirective();
    fakePermissions.isShared.returns(false);
    fakeGroups.focused = sinon.stub().returns({
      id: 'new-group'
    });
    $rootScope.$broadcast(events.GROUP_FOCUSED);
    assert.deepEqual(
      annotation.permissions.read, ['acct:bill@localhost'],
      'The annotation should still be private');
  });
});

describe('AnnotationController', function() {
  var createAnnotationDirective;
  var getCompileService;
  var getRootScope;

  before(function() {
    angular.module('h', [])
      .directive('annotation', require('../annotation').directive);
  });

  beforeEach(module('h'));

  beforeEach(module('h.templates'));

  getCompileService = function() {
    var $compile;
    $compile = null;
    inject(function(_$compile_) {
      $compile = _$compile_;
    });
    return $compile;
  };

  getRootScope = function() {
    var $rootScope;
    $rootScope = null;
    inject(function(_$rootScope_) {
      $rootScope = _$rootScope_;
    });
    return $rootScope;
  };

  /**
  Return an annotation directive instance and stub services etc.
  */
  createAnnotationDirective = function(args) {
    var compiledElement;
    var session = args.session || {
      state: {
        userid: 'acct:fred@hypothes.is'
      }
    };
    var locals = {
      personaFilter: args.personaFilter || function() {},
      momentFilter: args.momentFilter || {},
      urlencodeFilter: args.urlencodeFilter || {},
      drafts: args.drafts || {
        update: function() {},
        remove: function() {},
        get: function() {}
      },
      features: args.features || {
        flagEnabled: function() {
          return true;
        }
      },
      flash: args.flash || {
        info: function() {},
        error: function() {}
      },
      permissions: args.permissions || {
        isShared: function(permissions, group) {
          if (permissions.read) {
            return permissions.read.indexOf(group) !== -1;
          } else {
            return false;
          }
        },
        isPrivate: function(permissions, user) {
          if (permissions.read) {
            return permissions.read.indexOf(user) !== -1;
          } else {
            return false;
          }
        },
        permits: function() {
          return true;
        },
        shared: function() {
          return {};
        },
        'private': function() {
          return {};
        },
        'default': function() {
          return {};
        },
        setDefault: function() {}
      },
      session: session,
      tags: args.tags || {
        store: function() {}
      },
      time: args.time || {
        toFuzzyString: function() {},
        nextFuzzyUpdate: function() {}
      },
      annotationUI: args.annotationUI || {},
      annotationMapper: args.annotationMapper || {},
      groups: args.groups || {
        get: function() {},
        focused: function() {
          return {};
        }
      },
      documentTitleFilter: args.documentTitleFilter || function() {
        return '';
      },
      documentDomainFilter: args.documentDomainFilter || function() {
        return '';
      },
      localStorage: args.localStorage || {
        setItem: function() {},
        getItem: function() {}
      }
    };
    module(function($provide) {
      $provide.value('personaFilter', locals.personaFilter);
      $provide.value('momentFilter', locals.momentFilter);
      $provide.value('urlencodeFilter', locals.urlencodeFilter);
      $provide.value('drafts', locals.drafts);
      $provide.value('features', locals.features);
      $provide.value('flash', locals.flash);
      $provide.value('permissions', locals.permissions);
      $provide.value('session', locals.session);
      $provide.value('tags', locals.tags);
      $provide.value('time', locals.time);
      $provide.value('annotationUI', locals.annotationUI);
      $provide.value('annotationMapper', locals.annotationMapper);
      $provide.value('groups', locals.groups);
      $provide.value('documentTitleFilter', locals.documentTitleFilter);
      $provide.value('documentDomainFilter', locals.documentDomainFilter);
      $provide.value('localStorage', locals.localStorage);
    });
    locals.element = angular.element('<div annotation="annotation">');
    compiledElement = getCompileService()(locals.element);
    locals.$rootScope = getRootScope();
    locals.parentScope = locals.$rootScope.$new();
    locals.parentScope.annotation = args.annotation || {};
    locals.directive = compiledElement(locals.parentScope);
    locals.$rootScope.$digest();
    locals.controller = locals.element.controller('annotation');
    locals.isolateScope = locals.element.isolateScope();
    return locals;
  };

  describe('createAnnotationDirective', function() {
    it('creates the directive without crashing', function() {
      createAnnotationDirective({});
    });
  });

  it('sets the user of new annotations', function() {
    var annotation = {};
    var session = createAnnotationDirective({
      annotation: annotation
    }).session;
    assert.equal(annotation.user, session.state.userid);
  });

  it('sets the permissions of new annotations', function() {
    var annotation = {
      group: 'test-group'
    };
    var permissions = {
      'default': sinon.stub().returns('default permissions'),
      isShared: function() {},
      isPrivate: function() {}
    };
    createAnnotationDirective({
      annotation: annotation,
      permissions: permissions
    });
    assert(permissions['default'].calledWithExactly('test-group'));
    assert.equal(
      annotation.permissions, 'default permissions',
      'It should set a new annotation\'s permissions to what ' +
      'permissions.default() returns');
  });

  it(
    'doesn\'t overwrite permissions if the annotation already has them',
    function() {
      var annotation = {
        permissions: {
          read: ['foo'],
          update: ['bar'],
          'delete': ['gar'],
          admin: ['har']
        }
      };
      var originalPermissions = JSON.parse(JSON.stringify(
        annotation.permissions));
      var permissions = {
        'default': sinon.stub().returns('new permissions'),
        isShared: function() {},
        isPrivate: function() {}
      };
      createAnnotationDirective({
        annotation: annotation,
        permissions: permissions
      });
      assert.deepEqual(annotation.permissions, originalPermissions);
    }
  );

  describe('save', function() {
    it(
      'Passes group:<id> to the server when saving a new annotation',
      function() {
        var annotation = {
          user: 'acct:fred@hypothes.is',
          text: 'foo'
        };
        annotation.$create = sinon.stub().returns(Promise.resolve());
        var group = {
          id: 'test-id'
        };
        var controller = createAnnotationDirective({
          annotation: annotation,
          groups: {
            focused: function() {
              return group;
            },
            get: function() {}
          }
        }).controller;
        controller.action = 'create';
        return controller.save().then(function() {
          assert(annotation.$create.lastCall.thisValue.group === 'test-id');
        });
      }
    );
  });

  describe('when the user signs in', function() {
    it('sets the user of unsaved annotations', function() {
      var annotation = {};
      var session = {
        state: {
          userid: null
        }
      };
      var $rootScope = createAnnotationDirective({
        annotation: annotation,
        session: session
      }).$rootScope;
      assert(!annotation.user);
      session.state.userid = 'acct:fred@hypothes.is';
      $rootScope.$broadcast(events.USER_CHANGED, {});
      assert.equal(annotation.user, session.state.userid);
    });

    it('sets the permissions of unsaved annotations', function() {
      var annotation = {
        group: '__world__'
      };
      var session = {
        state: {
          userid: null
        }
      };
      var permissions = {
        'default': function() {
          return null;
        },
        isShared: function() {},
        isPrivate: function() {}
      };
      var $rootScope = createAnnotationDirective({
        annotation: annotation,
        session: session,
        permissions: permissions
      }).$rootScope;
      assert(!annotation.permissions);
      session.state.userid = 'acct:fred@hypothes.is';
      permissions['default'] = function() {
        return '__default_permissions__';
      };
      $rootScope.$broadcast(events.USER_CHANGED, {});
      assert.equal(annotation.permissions, '__default_permissions__');
    });
  });

  /*
  Simulate what happens when the user edits an annotation, clicks Save,
  gets an error because the server fails to save the annotation, then clicks
  Cancel - in the frontend the annotation should be restored to its original
  value, the edits lost.
    */
  it('restores the original text when editing is cancelled', function() {
    var controller = createAnnotationDirective({
      annotation: {
        id: 'test-annotation-id',
        user: 'acct:bill@localhost',
        text: 'Initial annotation body text',
        $create: function() {
          return Promise.resolve();
        },
        $update: function() {
          return Promise.reject({
            status: 500,
            statusText: 'Server Error',
            data: {}
          });
        }
      }
    }).controller;
    var originalText = controller.annotation.text;
    controller.edit();
    controller.annotation.text = 'changed by test code';
    controller.save();
    assert(controller.annotation.text === 'changed by test code');
    controller.revert();
    assert(controller.annotation.text === originalText);
  });

  it('clears the text when reverting changes to a highlight', function() {
    var controller = createAnnotationDirective({
      annotation: {
        id: 'test-annotation-id',
        user: 'acct:bill@localhost'
      }
    }).controller;
    controller.edit();
    assert.equal(controller.action, 'edit');
    controller.annotation.text = 'this should be reverted';
    controller.revert();
    assert.equal(controller.annotation.text, void 0);
  });
});

describe('validate()', function() {
  var validate = require('../annotation').validate;

  it('returns undefined if value is not an object', function() {
    var value;
    var i;
    var values = [2, 'foo', true, null];
    for (i = 0; i < values.length; i++) {
      assert.equal(validate(values[i]), undefined);
    }
  });

  it(
    'returns the length if the value contains a non-empty tags array',
    function() {
      assert.equal(
        validate({
          tags: ['foo', 'bar'],
          permissions: {
            read: ['group:__world__']
          },
          target: [1, 2, 3]
        }),
        2);
    }
  );

  it(
    'returns the length if the value contains a non-empty text string',
    function() {
      assert.equal(
        validate({
          text: 'foobar',
          permissions: {
            read: ['group:__world__']
          },
          target: [1, 2, 3]
        }),
        6);
    }
  );

  it('returns true for private highlights', function() {
    assert.equal(
      validate({
        permissions: {
          read: ['acct:seanh@hypothes.is']
        },
        target: [1, 2, 3]
      }),
      true);
  });

  it('returns true for group highlights', function() {
    assert.equal(
      validate({
        permissions: {
          read: ['group:foo']
        },
        target: [1, 2, 3]
      }),
      true);
  });

  it('returns false for public highlights', function() {
    assert.equal(
      validate({
        text: void 0,
        tags: void 0,
        permissions: {
          read: ['group:__world__']
        },
        target: [1, 2, 3]
      }),
      false);
  });

  it('handles values with no permissions', function() {
    assert.equal(
      validate({
        permissions: void 0,
        target: [1, 2, 3]
      }),
      true);
  });

  it('handles permissions objects with no read', function() {
    assert.equal(
      validate({
        permissions: {
          read: void 0
        },
        target: [1, 2, 3]
      }),
      true);
  });
});
