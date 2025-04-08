import { Component, OnDestroy, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ScrapService } from './services/scrap.service';
import { Subscription } from 'rxjs';
import { Node } from './model/interfaces/node.interface';
import { Matchday } from './model/interfaces/matchday.interface';
import * as moment from 'moment';
import { Match } from './model/interfaces/match.interface';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'footballtv';
  isProd = environment.production;

  deviceType?: 'MOBILE' | 'TABLET' | 'DESKTOP';

  scrapApiUrl = environment.scrapApi;

  scrappingData = true;
  scrappedData?: unknown;
  scrappedDataSubscription?: Subscription;
  scrappedDataRootNode?: Node;
  scrappedDataNodeList?: (string | Node)[];

  error?: unknown;

  matchDaysAll: Matchday[] = [];
  matchDaysFiltered: Matchday[] = [];

  filterData: {
    dates: string[],
    competitions: string[],
    teams: string[],
    tvs: string[]
  } = {
    dates: [],
    competitions: [],
    teams: [],
    tvs: []
  };

  constructor(
    private readonly scrapService: ScrapService
  ){}

  loadScrappedData() {
    this.scrappingData = true;
    this.scrappedDataSubscription = this.scrapService.scrapUrl('baloncestohoy.es').subscribe({
      next: (_scrappedData) => {
        this.error = undefined;
        this.scrappedData=_scrappedData;

        const scrappedDataHtml: {html: Node} = (this.scrappedData as {html: Node});
        
        this.scrappedDataRootNode = scrappedDataHtml.html;
        this.scrappedDataNodeList = this.findNodesWithClassAttr(this.scrappedDataRootNode, 'matchday') || undefined;
        
        if (this.scrappedDataNodeList?.length>0) {
          if (this.scrappedDataNodeList && this.scrappedDataNodeList.length>0) {
            this.buildMatchdayList();
            this.fillFilterData();
            this.doFilterData();
          }
        }
      },
      error:(_error) => {
        this.error = _error;
        this.scrappingData=false;
        this.scrappedData=undefined;
      },
      complete:() => this.scrappingData=false
    });
  }

  filter: {
    selectedDate: Date | null,
    selectedCompetition: string | null,
    selectedTeam: string | null,
    selectedTv: string | null
  } = {
    selectedDate: null,
    selectedCompetition: null,
    selectedTeam: null,
    selectedTv: null
  };

  matchMatchesFilter(match: Match): boolean {
    if (!this.isFilteredByDate() && !this.isFilteredByCompetition() && !this.isFilteredByTeam() && !this.isFilteredByTv()) {
      return true;
    } else if (this.isFilteredByCompetition() && this.filter.selectedCompetition===match.competition) {
      return true;
    } else if (this.isFilteredByTeam() && (this.filter.selectedTeam===match.homeTeam || this.filter.selectedTeam===match.awayTeam)) {
      return true;
    } else if (this.isFilteredByTv() && this.filter.selectedTv && match.tv.includes(this.filter.selectedTv)) {
      return true;
    }
    return this.isFilteredByDate() && moment(match.date).format('YYYY-MM-DD')===moment(this.filter.selectedDate).format('YYYY-MM-DD');
  }  

  private matchDayMatchesFilter(matchDay: Matchday): boolean {  
    if (this.isFilteredByDate()) { // If date filter exists
      // If matchday date matches
      if (moment(matchDay.date).format('YYYY-MM-DD')===moment(this.filter.selectedDate).format('YYYY-MM-DD')) {
        return true;
      }
      // If matchday date don't matches but any match matches
      return matchDay.matches.some((_match) => {
        return this.matchMatchesFilter(_match);
      });
    } else { // If date filter don't exists
      if(!this.isFilteredByDate() && !this.isFilteredByCompetition && !this.isFilteredByTeam() && !this.isFilteredByTv()){
        return true;
      }
      // If matchday date don't matches but any match matches
      return matchDay.matches.some((_match) => {
        return this.matchMatchesFilter(_match);
      });
    }
  }

  private isFilteredByDate(): boolean {
    return this.filter.selectedDate!==undefined && this.filter.selectedDate!=null;
  }
  private isFilteredByCompetition(): boolean {
    return this.filter.selectedCompetition!==undefined && this.filter.selectedCompetition!=null;
  }
  private isFilteredByTeam(): boolean {
    return this.filter.selectedTeam!==undefined && this.filter.selectedTeam!=null;
  }
  private isFilteredByTv(): boolean {
    return this.filter.selectedTv!==undefined && this.filter.selectedTv!=null;
  }

  doFilterData() {
    setTimeout(() => {
      const matchdaysCopy: Matchday[] = JSON.parse(JSON.stringify(this.matchDaysAll)) as Matchday[];
      this.matchDaysFiltered  = matchdaysCopy.filter((_matchday) => {
        return this.matchDayMatchesFilter(_matchday);
      }).map((_matchDay) => {
        _matchDay.matches = _matchDay.matches.filter((_match) => this.matchMatchesFilter(_match));
        return _matchDay;
      });
    }, 100);
  }

  private buildMatchdayList() {
    this.matchDaysAll = [];
    const dates: string[] = [];
    const competitions: string[] = [];
    if (this.scrappedDataNodeList) {
      this.scrappedDataNodeList.forEach((_matchdayNode) => {
        (_matchdayNode as Node).children?.forEach((_dateNodeChild, idx) => {
          if ((_dateNodeChild as Node).children!==undefined) {
            let _dateNodeChildChildren: (string | Node)[] | undefined = (_dateNodeChild as Node).children;
            if (idx===0 && (_dateNodeChild as Node).tag==='h2') {
              if (_dateNodeChildChildren) {
                this.matchDaysAll.push({
                  date: _dateNodeChildChildren[0] as string,
                  matches: []
                });
              }
            } else if (this.getNodeClass(_dateNodeChild as Node)==='matchdayCompetitionHeader') {
              if (_dateNodeChildChildren && (_dateNodeChildChildren[0] as Node).children) {
                _dateNodeChildChildren = (_dateNodeChildChildren[0] as Node).children;
                if (_dateNodeChildChildren) {
                  competitions.push(_dateNodeChildChildren[0] as string);
                }
              }
            } else if (this.getNodeClass(_dateNodeChild as Node)==='row row-eq-height') {
              const matchNodes: Node[] = this.findNodesWithClassAttr(_dateNodeChild as Node, 'match');
              matchNodes.forEach((_matchNode) => {
                const match: Match = {
                  date: dates[dates.length-1],
                  competition: competitions[competitions.length-1],
                  flag: '',
                  homeTeam: '',
                  awayTeam: '',
                  calendarUrl: '',
                  tv: []
                }
                this.addMatch(_matchNode, match);
              });
            }
          }
        });
      });
    }
  }

  private fillFilterData() {
    this.filterData = {
      dates: [],
      competitions: [],
      teams: [],
      tvs: []
    };

    this.matchDaysAll.forEach((_matchDay) => {
      this.filterData.dates.push(_matchDay.date);
      if (_matchDay.matches) {
        _matchDay.matches.forEach((_match) => {
          if (!this.filterData.competitions.some((_competition) => _competition===_match.competition)) {
            this.filterData.competitions.push(_match.competition);
          }
          if (!this.filterData.teams.some((_team) => _team===_match.homeTeam)) {
            this.filterData.teams.push(_match.homeTeam);
          }
          if (!this.filterData.teams.some((_team) => _team===_match.awayTeam)) {
            this.filterData.teams.push(_match.awayTeam);
          }
          if (_match.tv.length>0) {
            _match.tv.forEach((_tv) => {
              if (!this.filterData.tvs.some((__tv) => __tv===_tv)) {
                this.filterData.tvs.push(_tv);
              }
            });
          }
        });
      }
    });

    this.filterData.competitions.sort();
    this.filterData.teams.sort();
    this.filterData.tvs.sort();
  }

  private addMatch(node: Node, match: Match) {
    const faseNodes: Node[] = this.findNodesWithClassAttr(node, 'm_phase');
    const titleNodes: Node[] = this.findNodesWithClassAttr(node, 'm_title');
    const logoNodes: Node[] = this.findNodesWithClassAttr(node, 'm_logos');
    const tvNodes: Node[] = this.findNodesWithClassAttr(node, 'm_chan');
    const timeNodes: Node[] = this.findNodesWithClassAttr(node, 'm_time');

    if (faseNodes.length>0 && (faseNodes[0] as Node).children) {
      const faseNode: Node | undefined = faseNodes[0] as Node;
      if (faseNode && faseNode.children && faseNode.children[0] && (faseNode.children[0] as Node).children) {
        match.phase = ((faseNode.children[0] as Node).children as string[]).join();
      }
    }
    if (titleNodes.length>0 && (titleNodes[0] as Node).children) {
      const titleNode: Node = titleNodes[0] as Node;
      const teams: string[] = this.findNodesWithTag(titleNode, 'span').map((_team) => {
        return (_team.children as string[]).join();
      } )
      match.homeTeam = teams[0];
      match.awayTeam = teams[1];
    }
    if (logoNodes.length>0 && (logoNodes[0] as Node).children) {
      const logosNode: Node = logoNodes[0] as Node;
      const logos: string[] = this.findNodesWithTag(logosNode, 'img').map((_logo) => {
        return this.getNodeAttr(_logo, 'src');
      })
      match.homeLogo = logos[0];
      match.awayLogo = logos[1];
    }
    if (tvNodes.length>0 && (tvNodes[0] as Node).children) {
      match.tv = this.findNodesWithTag(tvNodes[0] as Node, 'span').map((_tvNode) => {
        return (_tvNode.children as string[]).join() || '';
      });
    }
    if (timeNodes) {
      const timeNode: Node | undefined = this.findNodesWithTag(timeNodes[0] as Node, 'span').length>0 ? this.findNodesWithTag(timeNodes[0] as Node, 'span')[0] : undefined;
      if (timeNode) {
        match.date = (timeNode.children as string[]).join();
      }
    }
    match.calendarUrl = this.getCalendarUrl(match);
    this.matchDaysAll[this.matchDaysAll.length-1].matches.push(match);
  }
  
  private getCalendarUrl(match: Match):string {
    //const title = encodeURIComponent(`${match.homeTeam} vs ${match.awayTeam}`);
    //const url = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&dates=20250408T190000/20250408CEST204500&details=Espa%C3%B1a+-+Portugal+-+TV:+La+2+/+RTVE+Play&location=UEFA+Nations+League+Femenina&trp=false&sprop&sprop=name:`;
    return '';
  }

  getNodeClass(node: Node): string {
    if (node.attrs!==undefined && node.attrs['class']) {
      return node.attrs['class'] || '';
    }
    return '';
  }
  getNodeAttr(node: Node, attr: string): string {
    if (node.attrs) {
      return node.attrs[attr];
    }
    return '';
  }

  private findNodesWithTag(node: Node, tagValue: string, results: Node[] = []): Node[] {
    if (node.attrs && node.attrs['class'] && (node.tag===tagValue)) {
      results.push(node);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === 'object') {
          this.findNodesWithTag(child, tagValue, results);
        }
      }
    }
    return results;
  }

  private findNodesWithClassAttr(node: Node, classValue: string, results: Node[] = []): Node[] {
    if (node.attrs && node.attrs['class'] && (node.attrs['class']===classValue || node.attrs['class'].split(' ').includes(classValue))) {
      results.push(node);
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === 'object') {
          this.findNodesWithClassAttr(child, classValue, results);
        }
      }
    }
    return results;
  }

  private checkDeviceType() {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) {
      this.deviceType = 'MOBILE';
    } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
      this.deviceType = 'TABLET';
    } else {
      this.deviceType = 'DESKTOP';
    }
  }
  
  ngOnInit(): void {
    this.loadScrappedData();
    this.checkDeviceType();    
  }

  ngOnDestroy(): void {
    if (this.scrappedDataSubscription) {
      this.scrappedDataSubscription.unsubscribe();
    }
  }
}
