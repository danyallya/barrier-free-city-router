import {describe,expect,it} from 'vitest';
import {projectInfo} from './project-info';
describe("Barrier-Free City Router project contract",()=>{it('keeps locale and direction aligned',()=>{expect(projectInfo.slug).toBe("barrier-free-city-router");expect(projectInfo.direction).toBe(projectInfo.locale==='fa-IR'?'rtl':'ltr');expect(projectInfo.firstTask.length).toBeGreaterThan(8);});});
