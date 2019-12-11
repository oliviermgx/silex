/**
 * Silex, live web creation
 * http://projects.silexlabs.org/?/silex/
 *
 * Copyright (c) 2012 Silex Labs
 * http://www.silexlabs.org/
 *
 * Silex is available under the GPL license
 * http://www.silexlabs.org/silex/silex-licensing/
 */

/**
 * @fileoverview A controller listens to a view element,
 *      and call the main {silex.controller.Controller} controller's methods
 *
 */
import {Model} from '../ClientTypes';
import {View} from '../ClientTypes';
import {ControllerBase} from './ControllerBase';

/**
 * @class ContextMenuController
 */
export class ContextMenuController extends ControllerBase {
  /**
   *
   * listen to the view events and call the main controller's methods}
   * @param view  view class which holds the other views
   */
  constructor(model: Model, view: View) {
    super(model, view);
  }
}
