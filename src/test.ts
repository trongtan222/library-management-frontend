// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Inject common testing modules and schemas into every TestBed.configureTestingModule
// to reduce repeated boilerplate across many specs and provide common providers.
const _origConfigure = TestBed.configureTestingModule.bind(TestBed);
(TestBed as any).configureTestingModule = (metadata: any) => {
  metadata = metadata || {};
  metadata.imports = [
    ...(metadata.imports || []),
    HttpClientTestingModule,
    RouterTestingModule,
    FormsModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot()
  ];
  metadata.schemas = [
    ...(metadata.schemas || []),
    CUSTOM_ELEMENTS_SCHEMA
  ];
  return _origConfigure(metadata);
};
