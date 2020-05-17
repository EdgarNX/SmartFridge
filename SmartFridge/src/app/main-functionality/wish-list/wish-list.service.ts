import {EventEmitter, Injectable} from '@angular/core';
import {FoodUnitDetailed} from '../shared/foodUnitDetailed.model';
import {DatePipe} from '@angular/common';
import {AngularFireDatabase} from '@angular/fire/database';
import * as firebase from 'firebase';



@Injectable()
export class WishListService {
  foodUnitsDetailedChanged = new EventEmitter<FoodUnitDetailed[]>();
  startedEditing = new EventEmitter<number>();
  isExpired = false;
  public foodUnitsDetailed: FoodUnitDetailed[] = [
  ];
  constructor(private datePipe: DatePipe, private db: AngularFireDatabase) {}

  async delay(ms: number) {
    await new Promise(resolve => setTimeout(() => resolve(), ms)).then(() => {
      this.foodUnitsDetailedChanged.emit(this.foodUnitsDetailed.slice());
      return this.foodUnitsDetailed.slice();
    });
  }

  getFoodUnitsDetailed() {
    let theKey = JSON.stringify(localStorage.getItem('selectedFridgeKey'));
    theKey = theKey.substring(1, theKey.length - 1);
    this.db.list('fridges/' + theKey + '/wishList')
      .valueChanges()
      .subscribe(async (res) => {
        this.foodUnitsDetailed = JSON.parse(JSON.stringify(res));
        this.delay(500);
      });
  }

  getFoodUnitDetailed(index: number) {
    return this.foodUnitsDetailed[index];
  }

  addFoodUnitDetailed(foodUnitDetailed: FoodUnitDetailed) {
    let theKey = JSON.stringify(localStorage.getItem('selectedFridgeKey'));
    theKey = theKey.substring(1, theKey.length - 1);
    const items = this.db.list('fridges/' + theKey + '/wishList');
    items.push(foodUnitDetailed);
    this.foodUnitsDetailedChanged.emit(this.foodUnitsDetailed.slice());
  }

  updateFoodUnitDetailed(index: number, newFoodUnitDetailed: FoodUnitDetailed) {

    let theKey = JSON.stringify(localStorage.getItem('selectedFridgeKey'));
    theKey = theKey.substring(1, theKey.length - 1);
    const ref = firebase.database().ref('fridges/' + theKey + '/wishList');
    ref.orderByChild('name').
    equalTo(this.foodUnitsDetailed[index].name).
    on('child_added', (snapshot) => {
      if (JSON.stringify(snapshot.toJSON()) === JSON.stringify(this.foodUnitsDetailed[index]) ) {
        const adaNameRef = firebase.database().ref('fridges/' + theKey + '/wishList/' + snapshot.key + '/');
        adaNameRef.update({
          name: newFoodUnitDetailed.name,
          expirationDate: newFoodUnitDetailed.expirationDate,
          amountSize: newFoodUnitDetailed.amountSize,
          amount: newFoodUnitDetailed.amount,
          storeLocation: newFoodUnitDetailed.storeLocation,
        });
      }
    });
    this.foodUnitsDetailedChanged.emit(this.foodUnitsDetailed.slice());
  }

  deleteAll() {
    for (const f of this.foodUnitsDetailed) {
      this.deleteFoodUnitDetailed(this.foodUnitsDetailed.indexOf(f));
    }
  }

  deleteFoodUnitDetailed(index: number) {
    let theKey = JSON.stringify(localStorage.getItem('selectedFridgeKey'));
    theKey = theKey.substring(1, theKey.length - 1);
    const ref = firebase.database().ref('fridges/' + theKey + '/wishList');
    ref.orderByChild('name').
    equalTo(this.foodUnitsDetailed[index].name).
    on('child_added', (snapshot) => {
      if (JSON.stringify(snapshot.toJSON()) === JSON.stringify(this.foodUnitsDetailed[index]) ) {
        firebase.database().ref().child('fridges/' + theKey + '/wishList/' + snapshot.key + '/').remove();
      }
    });
    this.foodUnitsDetailedChanged.emit(this.foodUnitsDetailed.slice());
  }

  deleteAllExpiredFoodUnitsDetailed() {
    for (const item of this.foodUnitsDetailed) {
      if (this.checkIfExpired(item)) {
        this.deleteFoodUnitDetailed(this.foodUnitsDetailed.indexOf(item));
        this.foodUnitsDetailedChanged.emit(this.foodUnitsDetailed.slice());
      }
    }
  }

  checkIfExpired(currentFoodUnitDetailed: FoodUnitDetailed) {
    const currentDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd');
    const currentYear: number = +currentDate.slice(0, 4);
    const currentMonth: number = +currentDate.slice(5, 7);
    const currentDay: number = +currentDate.slice(8, 10);
    const expirationDate: number[] = currentFoodUnitDetailed.expirationDate.split('-', 3).map(Number);
    const expirationYear: number = expirationDate[0];
    const expirationMonth: number = expirationDate[1];
    const expirationDay: number = expirationDate[2];
    if (currentYear > expirationYear) {
      return true;
    } else if (currentYear === expirationYear && currentMonth > expirationMonth) {
      return true;
    } else {
      return currentYear === expirationYear && currentMonth === expirationMonth && currentDay > expirationDay;
    }
  }
  getColor(currentFoodUnitDetailed: FoodUnitDetailed) {
    this.isExpired = this.checkIfExpired(currentFoodUnitDetailed);
    return this.isExpired === false ? 'darkgreen' : 'darkred';
  }
}
